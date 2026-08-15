/**
 * In-process event bus.
 *
 * For local dev and tests, so `docker compose up kafka` is not a prerequisite
 * for running the app. It implements the same contract and performs the same
 * validation as the Kafka bus, and it is honest about what it is not:
 *
 *   - events never leave the process, so nothing another service publishes
 *     will ever arrive here, and nothing published here reaches them
 *   - there is no durability, no replay, no consumer groups, no partitions
 *   - a subscriber that starts after a publish has already missed it
 *
 * `describe()` says all of that out loud, and createEventBus refuses to select
 * this backend silently in production.
 */

import {
  createEnvelope,
  type BusHealth,
  type EventBus,
  type EventHandler,
  type PublishOptions,
  type SubscribeOptions,
  type Subscription,
} from './bus';
import type { EventEnvelope, EventType, PayloadInput } from './events';

interface Registration {
  types: ReadonlySet<string>;
  handler: EventHandler<never>;
  onInvalidMessage?: (error: unknown, raw: unknown) => void;
}

export interface MemoryEventBusOptions {
  source?: string;
  /**
   * Keep every published envelope in memory for assertions in tests.
   * Off by default — an unbounded buffer in a long-running dev process is a
   * slow memory leak.
   */
  recordHistory?: boolean;
}

export class MemoryEventBus implements EventBus {
  readonly backend = 'memory' as const;

  private readonly source: string;
  private readonly registrations = new Set<Registration>();
  private readonly history: EventEnvelope[] = [];
  private readonly recordHistory: boolean;
  private connected = false;

  constructor(options: MemoryEventBusOptions = {}) {
    this.source = options.source ?? 'unknown';
    this.recordHistory = options.recordHistory ?? false;
  }

  describe(): string {
    return (
      'in-process event bus: events are delivered to handlers in this process ' +
      'only. Nothing is sent to or received from Kafka, nothing is persisted, ' +
      'and no other service can see these events.'
    );
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.registrations.clear();
  }

  async publish<T extends EventType>(
    type: T,
    payload: PayloadInput<T>,
    options: PublishOptions = {},
  ): Promise<EventEnvelope<T>> {
    const envelope = createEnvelope(type, payload, this.source, options);

    if (this.recordHistory) {
      this.history.push(envelope);
    }

    // Snapshot: a handler may subscribe or unsubscribe while we are dispatching.
    const targets = [...this.registrations].filter((r) => r.types.has(type));

    // Sequential, not Promise.all: one slow handler delaying the next is a
    // truer rehearsal of a partitioned consumer than unbounded concurrency,
    // and it keeps per-correlationId ordering intact.
    for (const registration of targets) {
      try {
        await (registration.handler as EventHandler<T>)(envelope);
      } catch (error) {
        // A throwing handler must not take down the publisher or starve the
        // handlers queued behind it. Kafka would retry the batch; here the
        // closest honest equivalent is to report and continue.
        if (registration.onInvalidMessage) {
          registration.onInvalidMessage(error, envelope);
        } else {
          console.error(
            `[events] handler for "${type}" threw; continuing:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    return envelope;
  }

  async subscribe<T extends EventType>(
    types: readonly T[],
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): Promise<Subscription> {
    const registration: Registration = {
      types: new Set<string>(types),
      handler: handler as EventHandler<never>,
      onInvalidMessage: options.onInvalidMessage,
    };
    this.registrations.add(registration);

    return {
      unsubscribe: async () => {
        this.registrations.delete(registration);
      },
    };
  }

  async health(): Promise<BusHealth> {
    return {
      backend: this.backend,
      connected: this.connected,
      detail: this.connected
        ? `in-process, ${this.registrations.size} active subscription(s), not connected to Kafka`
        : 'in-process, not connected',
    };
  }

  /* -- test helpers -------------------------------------------------------- */

  /** Envelopes published so far. Empty unless `recordHistory` was set. */
  published(): readonly EventEnvelope[] {
    return this.history;
  }

  publishedOfType<T extends EventType>(type: T): EventEnvelope<T>[] {
    return this.history.filter((e): e is EventEnvelope<T> => e.type === type);
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}
