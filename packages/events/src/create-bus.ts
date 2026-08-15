/**
 * Backend selection.
 *
 * The one rule this file exists to enforce: **a process must never think it is
 * publishing to Kafka when it is not.** A silent fallback to the in-process bus
 * looks identical to a working system from the inside — publishes succeed,
 * handlers fire, nothing throws — while every other service sees no traffic at
 * all. So selection is explicit, always announced, and refuses the unsafe
 * combination outright.
 */

import type { EventBus } from './bus';
import { KafkaEventBus, type KafkaEventBusOptions } from './kafka-bus';
import { MemoryEventBus } from './memory-bus';

export type BusSelectionReason = 'explicit' | 'brokers-configured' | 'no-brokers-configured';

export interface CreateEventBusOptions {
  /** Service name, used as the Kafka clientId and the envelope `source`. */
  source: string;
  /** Defaults to process.env. Injectable for tests. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to console.  */
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
  /** Default Kafka consumer group for subscribe() calls without one. */
  defaultGroupId?: string;
  ensureTopics?: boolean;
  /** Keep publish history in the memory bus. Tests only. */
  recordHistory?: boolean;
}

export interface BusSelection {
  bus: EventBus;
  backend: 'kafka' | 'memory';
  reason: BusSelectionReason;
  /** The line that was logged, so callers can surface it too. */
  announcement: string;
}

function parseBrokers(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
}

function isTruthy(raw: string | undefined): boolean {
  if (!raw) return false;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/**
 * Decide which backend to use, build it, and say so.
 *
 * Environment:
 *   EVENT_BUS_BACKEND  kafka | memory   — explicit override
 *   KAFKA_BROKERS      comma-separated  — implies kafka when BACKEND is unset
 *   KAFKA_SSL          truthy
 *   KAFKA_SASL_USERNAME / KAFKA_SASL_PASSWORD / KAFKA_SASL_MECHANISM
 *   EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION  truthy — see below
 *
 * With NODE_ENV=production and the memory backend selected, this throws.
 * Running production on a bus that drops every cross-service event is a
 * data-loss bug that presents as silence, and silence is exactly what nobody
 * notices. Set EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION=true to override it
 * deliberately — that still logs at error level on every startup.
 */
export function createEventBus(options: CreateEventBusOptions): BusSelection {
  const env = options.env ?? process.env;
  const log = options.logger ?? console;

  const brokers = parseBrokers(env.KAFKA_BROKERS);
  const explicit = env.EVENT_BUS_BACKEND?.trim().toLowerCase();

  if (explicit && explicit !== 'kafka' && explicit !== 'memory') {
    throw new Error(
      `EVENT_BUS_BACKEND must be "kafka" or "memory", got "${env.EVENT_BUS_BACKEND}"`,
    );
  }

  let backend: 'kafka' | 'memory';
  let reason: BusSelectionReason;

  if (explicit === 'kafka' || explicit === 'memory') {
    backend = explicit;
    reason = 'explicit';
  } else if (brokers.length) {
    backend = 'kafka';
    reason = 'brokers-configured';
  } else {
    backend = 'memory';
    reason = 'no-brokers-configured';
  }

  if (backend === 'kafka' && !brokers.length) {
    throw new Error(
      'EVENT_BUS_BACKEND=kafka but KAFKA_BROKERS is empty. Set KAFKA_BROKERS ' +
        '(e.g. "localhost:9092") or use EVENT_BUS_BACKEND=memory for local dev.',
    );
  }

  const isProduction = env.NODE_ENV === 'production';
  if (backend === 'memory' && isProduction) {
    const message =
      'Event bus resolved to the in-process backend under NODE_ENV=production. ' +
      'Events would be delivered only inside this process: no other service ' +
      'would receive them, and nothing would be persisted or replayable. ' +
      (reason === 'no-brokers-configured'
        ? 'KAFKA_BROKERS is not set.'
        : 'EVENT_BUS_BACKEND=memory was set explicitly.');

    if (!isTruthy(env.EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION)) {
      throw new Error(
        `${message} Set KAFKA_BROKERS, or set ` +
          'EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION=true to accept this deliberately.',
      );
    }
    log.error(
      `[events] ${message} Continuing because ` + 'EVENT_BUS_ALLOW_MEMORY_IN_PRODUCTION is set.',
    );
  }

  const bus: EventBus =
    backend === 'kafka'
      ? new KafkaEventBus(buildKafkaOptions(options, env, brokers))
      : new MemoryEventBus({
          source: options.source,
          recordHistory: options.recordHistory,
        });

  const announcement = `[events] ${options.source} using ${bus.describe()} (reason: ${reason})`;

  // Always announced, at a level matching how surprising it is.
  if (backend === 'memory' && isProduction) {
    log.error(announcement);
  } else if (backend === 'memory') {
    log.warn(announcement);
  } else {
    log.info(announcement);
  }

  return { bus, backend, reason, announcement };
}

function buildKafkaOptions(
  options: CreateEventBusOptions,
  env: NodeJS.ProcessEnv,
  brokers: string[],
): KafkaEventBusOptions {
  const username = env.KAFKA_SASL_USERNAME;
  const password = env.KAFKA_SASL_PASSWORD;

  return {
    brokers,
    clientId: options.source,
    source: options.source,
    ssl: isTruthy(env.KAFKA_SSL),
    sasl:
      username && password
        ? ({
            mechanism: (env.KAFKA_SASL_MECHANISM ?? 'plain') as 'plain',
            username,
            password,
          } as KafkaEventBusOptions['sasl'])
        : undefined,
    defaultGroupId: options.defaultGroupId,
    ensureTopics: options.ensureTopics ?? isTruthy(env.KAFKA_ENSURE_TOPICS),
  };
}
