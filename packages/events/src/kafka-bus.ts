/**
 * KafkaJS-backed event bus.
 */

import {
  Kafka,
  logLevel as KafkaLogLevel,
  type Consumer,
  type Producer,
  type SASLOptions,
} from 'kafkajs';
import {
  createEnvelope,
  type BusHealth,
  type EventBus,
  type EventHandler,
  type PublishOptions,
  type SubscribeOptions,
  type Subscription,
} from './bus';
import {
  parseEnvelope,
  partitionKeyFor,
  topicFor,
  type EventEnvelope,
  type EventType,
  type PayloadInput,
} from './events';
import { TOPIC_CONFIGS, type TopicName } from './topics';

export interface KafkaEventBusOptions {
  brokers: string[];
  clientId: string;
  /** Service name stamped onto every envelope's `source`. */
  source?: string;
  ssl?: boolean;
  sasl?: SASLOptions;
  /** Default consumer group when `subscribe` is called without one. */
  defaultGroupId?: string;
  /**
   * Create topics at connect time if missing. Handy for dev clusters that do
   * not have auto-creation enabled; leave off in production, where topics
   * should be provisioned deliberately with reviewed partition counts.
   */
  ensureTopics?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
}

export class KafkaEventBus implements EventBus {
  readonly backend = 'kafka' as const;

  private readonly kafka: Kafka;
  private readonly options: KafkaEventBusOptions;
  private readonly source: string;
  private producer: Producer | null = null;
  private readonly consumers = new Set<Consumer>();
  private connected = false;

  constructor(options: KafkaEventBusOptions) {
    if (!options.brokers.length) {
      throw new Error('KafkaEventBus requires at least one broker');
    }
    this.options = options;
    this.source = options.source ?? options.clientId;
    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      ssl: options.ssl,
      sasl: options.sasl,
      connectionTimeout: options.connectionTimeout ?? 3_000,
      requestTimeout: options.requestTimeout ?? 30_000,
      // KafkaJS logs at INFO by default, which is noisy enough to bury real
      // problems. Warnings and errors still come through.
      logLevel: KafkaLogLevel.WARN,
      retry: { initialRetryTime: 300, retries: 8 },
    });
  }

  describe(): string {
    return `kafka event bus: brokers ${this.options.brokers.join(', ')} as "${this.options.clientId}"`;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    if (this.options.ensureTopics) {
      await this.ensureTopics();
    }

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true, // no duplicates on internal produce retries
    });
    await this.producer.connect();
    this.connected = true;
  }

  private async ensureTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      const existing = new Set(await admin.listTopics());
      const missing = TOPIC_CONFIGS.filter((c) => !existing.has(c.topic));
      if (missing.length) {
        await admin.createTopics({
          waitForLeaders: true,
          topics: missing.map((c) => ({
            topic: c.topic,
            numPartitions: c.numPartitions,
            replicationFactor: c.replicationFactor,
            configEntries: c.configEntries,
          })),
        });
      }
    } finally {
      await admin.disconnect();
    }
  }

  async disconnect(): Promise<void> {
    await Promise.allSettled([...this.consumers].map((c) => c.disconnect()));
    this.consumers.clear();

    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
    this.connected = false;
  }

  async publish<T extends EventType>(
    type: T,
    payload: PayloadInput<T>,
    options: PublishOptions = {},
  ): Promise<EventEnvelope<T>> {
    if (!this.producer) {
      throw new Error(
        'KafkaEventBus.publish called before connect(). Call connect() during service startup.',
      );
    }

    const envelope = createEnvelope(type, payload, this.source, options);
    const key = partitionKeyFor(envelope);

    await this.producer.send({
      topic: topicFor(type),
      messages: [
        {
          key: key ?? null,
          value: JSON.stringify(envelope),
          headers: {
            // Readable without deserialising the body — lets a consumer or an
            // inspection tool route and filter on type alone.
            'event-type': type,
            'event-id': envelope.id,
            'event-version': String(envelope.version),
          },
        },
      ],
    });

    return envelope;
  }

  async subscribe<T extends EventType>(
    types: readonly T[],
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): Promise<Subscription> {
    if (!types.length) {
      throw new Error('subscribe() requires at least one event type');
    }

    const groupId = options.groupId ?? this.options.defaultGroupId;
    if (!groupId) {
      throw new Error(
        'subscribe() requires a groupId, either per-call or via defaultGroupId. ' +
          'Kafka consumers cannot share partitions without one.',
      );
    }

    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();

    const topics = [...new Set(types.map((t) => topicFor(t)))] as TopicName[];
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    // A subscription may cover only some of the event types on a topic, so the
    // handler still has to be filtered by type after deserialising.
    const wanted = new Set<string>(types);

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        let envelope: EventEnvelope;
        try {
          envelope = parseEnvelope(JSON.parse(message.value.toString()));
        } catch (error) {
          // Do not rethrow: an unparseable message would be redelivered
          // forever and block its partition for every other job.
          if (options.onInvalidMessage) {
            options.onInvalidMessage(error, message.value.toString());
          } else {
            console.error(
              '[events] dropping unparseable message:',
              error instanceof Error ? error.message : error,
            );
          }
          return;
        }

        if (!wanted.has(envelope.type)) return;

        await (handler as EventHandler)(envelope);
      },
    });

    this.consumers.add(consumer);

    return {
      unsubscribe: async () => {
        this.consumers.delete(consumer);
        await consumer.disconnect();
      },
    };
  }

  async health(): Promise<BusHealth> {
    if (!this.connected) {
      return {
        backend: this.backend,
        connected: false,
        detail: 'kafka producer not connected',
      };
    }

    // Cheap round-trip that proves the cluster is actually reachable, rather
    // than reporting healthy off a stale connection flag.
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      const topics = await admin.listTopics();
      return {
        backend: this.backend,
        connected: true,
        detail: `kafka reachable at ${this.options.brokers.join(', ')}, ${topics.length} topic(s)`,
      };
    } catch (error) {
      return {
        backend: this.backend,
        connected: false,
        detail: `kafka unreachable: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
  }
}
