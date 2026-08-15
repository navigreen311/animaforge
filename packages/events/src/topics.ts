/**
 * Kafka topic definitions.
 *
 * Topics are versioned in the name (`.v1`). A breaking payload change means a
 * new topic, not a mutated one — consumers on the old topic keep working while
 * they migrate. Additive, optional fields do not need a new topic.
 */

export const TOPIC_PREFIX = 'animaforge';

/**
 * Every topic this platform publishes to.
 *
 * Keyed by domain, not by event type: all generation lifecycle events share one
 * topic so that a single consumer sees them in per-job order. Kafka only
 * guarantees ordering within a partition, and we partition by job id (see
 * `partitionKeyFor`), so one topic + one key = one ordered stream per job.
 */
export const TOPICS = {
  /** Generation job lifecycle: started, progress, completed, failed. */
  GENERATION: `${TOPIC_PREFIX}.generation.v1`,
  /** The 4-stage governance pipeline: moderation, consent, C2PA, watermark. */
  GOVERNANCE: `${TOPIC_PREFIX}.governance.v1`,
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export const ALL_TOPICS: readonly TopicName[] = Object.freeze(Object.values(TOPICS) as TopicName[]);

/**
 * Topic configuration used when creating topics via the Kafka admin client.
 *
 * `partitions: 3` is a starting point for a single-broker dev cluster, not a
 * production sizing decision — raise it before load, because partitions can be
 * added but never removed without breaking key-to-partition affinity.
 *
 * Governance events are retained ~4x longer than generation progress: they are
 * the audit trail for what was moderated, consented, signed and watermarked.
 */
export interface TopicConfig {
  topic: TopicName;
  numPartitions: number;
  replicationFactor: number;
  configEntries: { name: string; value: string }[];
}

const DAYS = 24 * 60 * 60 * 1000;

export const TOPIC_CONFIGS: readonly TopicConfig[] = Object.freeze([
  {
    topic: TOPICS.GENERATION,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [{ name: 'retention.ms', value: String(7 * DAYS) }],
  },
  {
    topic: TOPICS.GOVERNANCE,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [{ name: 'retention.ms', value: String(30 * DAYS) }],
  },
]);
