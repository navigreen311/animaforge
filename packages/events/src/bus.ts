/**
 * The EventBus contract, shared by the Kafka and in-process implementations.
 */

import { randomUUID } from 'node:crypto';
import {
  ENVELOPE_VERSION,
  type EventEnvelope,
  type EventType,
  type PayloadInput,
  parsePayload,
} from './events';

export type BusBackend = 'kafka' | 'memory';

export interface PublishOptions {
  /**
   * Ties related events together and, on Kafka, selects the partition — so
   * events sharing a correlationId stay ordered. Defaults to `payload.jobId`
   * when the payload has one.
   */
  correlationId?: string;
  /** Overrides the bus-level source name for a single publish. */
  source?: string;
}

export type EventHandler<T extends EventType = EventType> = (
  envelope: EventEnvelope<T>,
) => void | Promise<void>;

export interface Subscription {
  /** Stop receiving events. Safe to call more than once. */
  unsubscribe(): Promise<void>;
}

export interface SubscribeOptions {
  /**
   * Kafka consumer group. Members of one group share the partitions, so each
   * event goes to exactly one member — that is how you scale a consumer
   * horizontally. Two *different* groups each get their own copy.
   *
   * Ignored by the in-process bus, which has no notion of group membership and
   * delivers to every handler.
   */
  groupId?: string;
  /**
   * Called when a message arrives that fails schema validation, instead of
   * throwing into the consumer loop. Without it, a single poisoned message
   * would be retried forever and block its partition.
   */
  onInvalidMessage?: (error: unknown, raw: unknown) => void;
}

export interface BusHealth {
  backend: BusBackend;
  connected: boolean;
  /** Plain-language state, safe to log or surface on a health endpoint. */
  detail: string;
}

export interface EventBus {
  readonly backend: BusBackend;

  /**
   * One line describing exactly what this bus is and is not doing. Printed at
   * startup so nobody has to guess whether events are really leaving the
   * process. See createEventBus for why that matters.
   */
  describe(): string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  publish<T extends EventType>(
    type: T,
    payload: PayloadInput<T>,
    options?: PublishOptions,
  ): Promise<EventEnvelope<T>>;

  subscribe<T extends EventType>(
    types: readonly T[],
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<Subscription>;

  health(): Promise<BusHealth>;
}

/**
 * Build a validated envelope. Shared by both implementations so a payload that
 * would be rejected on Kafka is rejected identically in local dev — the
 * fallback bus being laxer than the real one is exactly how bad payloads reach
 * production.
 */
export function createEnvelope<T extends EventType>(
  type: T,
  payload: PayloadInput<T>,
  source: string,
  options: PublishOptions = {},
): EventEnvelope<T> {
  const parsed = parsePayload(type, payload);

  const correlationId =
    options.correlationId ??
    (typeof (parsed as { jobId?: unknown }).jobId === 'string'
      ? (parsed as { jobId: string }).jobId
      : undefined);

  return {
    id: randomUUID(),
    type,
    version: ENVELOPE_VERSION,
    occurredAt: new Date().toISOString(),
    source: options.source ?? source,
    correlationId,
    payload: parsed,
  } as EventEnvelope<T>;
}
