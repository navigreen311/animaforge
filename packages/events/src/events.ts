/**
 * Event schemas.
 *
 * These mirror what the platform already emits — the payload shapes are taken
 * from the `emitRealtimeEvent` calls in services/workers/src/workers/
 * generationWorker.ts and the stage/status vocabulary of runGovernancePipeline.
 * They are not an idealised redesign: if a field is here, something in the
 * codebase already produces it.
 *
 * Schemas are zod, not bare TypeScript interfaces, because the whole point of a
 * message bus is that the producer and consumer are different processes on
 * different deploy cycles. A type assertion across that boundary is a wish; a
 * parse is a check.
 */

import { z } from 'zod';
import { TOPICS, type TopicName } from './topics';

/* ------------------------------------------------------------------------- */
/*  Shared vocabulary                                                        */
/* ------------------------------------------------------------------------- */

/** Mirrors GenerationType in services/workers/src/workers/generationWorker.ts */
export const generationTypeSchema = z.enum([
  'video',
  'audio',
  'avatar',
  'style_clone',
  'img_to_cartoon',
]);

/** Mirrors JobStatus in services/workers/src/utils/jobHelpers.ts */
export const jobStatusSchema = z.enum(['queued', 'running', 'complete', 'failed']);

/** The 4 stages of runGovernancePipeline, in pipeline order. */
export const governanceStageSchema = z.enum([
  'content_moderation',
  'consent_validation',
  'c2pa_signing',
  'watermarking',
]);

/**
 * Statuses emitted by runGovernancePipeline's progress callback.
 * `alert` is C2PA signing exhausting its retries; `manual_review` is a
 * watermark failure, which explicitly does not block delivery.
 */
export const governanceStatusSchema = z.enum([
  'running',
  'passed',
  'blocked',
  'alert',
  'manual_review',
]);

export const qualityScoresSchema = z.object({
  overall: z.number(),
  fidelity: z.number(),
  consistency: z.number(),
});

/** Mirrors GpuEstimate in services/workers/src/workers/generationWorker.ts */
export const gpuEstimateSchema = z.object({
  gpu_class: z.enum(['T4', 'A10G', 'A100', 'H100']),
  vram_required_gb: z.number(),
  estimated_time_seconds: z.number(),
  cost_credits: z.number(),
});

/* ------------------------------------------------------------------------- */
/*  Payload schemas                                                          */
/* ------------------------------------------------------------------------- */

const jobRef = {
  jobId: z.string().min(1),
  userId: z.string().min(1),
};

export const generationStartedSchema = z.object({
  ...jobRef,
  projectId: z.string().min(1),
  type: generationTypeSchema,
  tier: z.string().optional(),
  gpuEstimate: gpuEstimateSchema.optional(),
});

export const generationAiSubmittedSchema = z.object({
  ...jobRef,
  aiJobId: z.string().min(1),
  estimatedDuration: z.number().optional(),
});

export const generationProgressSchema = z.object({
  ...jobRef,
  stage: z.string().min(1),
  progress: z.number().min(0).max(100),
  aiStatus: z.string().optional(),
});

export const generationCompletedSchema = z.object({
  ...jobRef,
  outputUrl: z.string().min(1),
  qualityScores: qualityScoresSchema.optional(),
  /** True when the result was served from the input-hash cache. */
  deduplicated: z.boolean().default(false),
});

export const generationFailedSchema = z.object({
  ...jobRef,
  reason: z.string(),
  stage: z.string().optional(),
});

export const governanceStageChangedSchema = z.object({
  jobId: z.string().min(1),
  stage: governanceStageSchema,
  status: governanceStatusSchema,
  progress: z.number().min(0).max(100).optional(),
});

export const governanceCompletedSchema = z.object({
  jobId: z.string().min(1),
  passed: z.boolean(),
  manifest: z
    .object({
      manifestId: z.string(),
      signature: z.string(),
      signedAt: z.string(),
    })
    .optional(),
  watermarkId: z.string().optional(),
  /** Present iff passed === false. */
  blockedReason: z.string().optional(),
});

/* ------------------------------------------------------------------------- */
/*  Registry                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * The single source of truth mapping event type -> topic + payload schema.
 * Adding an event means adding one entry here; the bus, the types and the
 * validation all follow from it.
 */
export const EVENT_REGISTRY = {
  'generation.started': {
    topic: TOPICS.GENERATION,
    schema: generationStartedSchema,
  },
  'generation.ai_submitted': {
    topic: TOPICS.GENERATION,
    schema: generationAiSubmittedSchema,
  },
  'generation.progress': {
    topic: TOPICS.GENERATION,
    schema: generationProgressSchema,
  },
  'generation.completed': {
    topic: TOPICS.GENERATION,
    schema: generationCompletedSchema,
  },
  'generation.failed': {
    topic: TOPICS.GENERATION,
    schema: generationFailedSchema,
  },
  'governance.stage_changed': {
    topic: TOPICS.GOVERNANCE,
    schema: governanceStageChangedSchema,
  },
  'governance.completed': {
    topic: TOPICS.GOVERNANCE,
    schema: governanceCompletedSchema,
  },
} as const;

export type EventType = keyof typeof EVENT_REGISTRY;

export const ALL_EVENT_TYPES = Object.keys(EVENT_REGISTRY) as EventType[];

/** The parsed payload type for a given event type. */
export type PayloadOf<T extends EventType> = z.infer<(typeof EVENT_REGISTRY)[T]['schema']>;

/** The payload type accepted by `publish` (before zod defaults are applied). */
export type PayloadInput<T extends EventType> = z.input<(typeof EVENT_REGISTRY)[T]['schema']>;

export function topicFor(type: EventType): TopicName {
  return EVENT_REGISTRY[type].topic;
}

export function isEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_REGISTRY, value);
}

/** Every event type that lands on a given topic. */
export function eventTypesForTopic(topic: TopicName): EventType[] {
  return ALL_EVENT_TYPES.filter((t) => EVENT_REGISTRY[t].topic === topic);
}

/* ------------------------------------------------------------------------- */
/*  Envelope                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Every message on the bus is wrapped in this envelope. The payload is the only
 * part that varies by event type; everything else is what a consumer needs to
 * route, trace, de-duplicate and reject a message without knowing its schema.
 */
export interface EventEnvelope<T extends EventType = EventType> {
  /** Unique per publish. Consumers use it for idempotency. */
  id: string;
  type: T;
  /** Schema version within the topic. Bump on additive change. */
  version: number;
  /** ISO-8601, set by the producer at publish time. */
  occurredAt: string;
  /** Service that published it, e.g. "workers", "gateway". */
  source: string;
  /**
   * Ties related events together across services. For generation and
   * governance events this is the job id, which is also the partition key —
   * so one job's events stay ordered relative to each other.
   */
  correlationId?: string;
  payload: PayloadOf<T>;
}

export const ENVELOPE_VERSION = 1;

const envelopeBaseSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: z.number().int().positive(),
  occurredAt: z.string().min(1),
  source: z.string().min(1),
  correlationId: z.string().optional(),
  payload: z.unknown(),
});

export class EventValidationError extends Error {
  constructor(
    message: string,
    readonly rawValue: unknown,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EventValidationError';
  }
}

/**
 * Parse and validate a message off the wire.
 *
 * Throws EventValidationError rather than returning null: a malformed message
 * is a contract breach between services, and swallowing it silently is how a
 * bus quietly stops delivering half its traffic.
 */
export function parseEnvelope(raw: unknown): EventEnvelope {
  const base = envelopeBaseSchema.safeParse(raw);
  if (!base.success) {
    throw new EventValidationError(
      `Malformed event envelope: ${base.error.message}`,
      raw,
      base.error,
    );
  }

  const { type } = base.data;
  if (!isEventType(type)) {
    throw new EventValidationError(
      `Unknown event type "${type}". Known types: ${ALL_EVENT_TYPES.join(', ')}`,
      raw,
    );
  }

  const payload = EVENT_REGISTRY[type].schema.safeParse(base.data.payload);
  if (!payload.success) {
    throw new EventValidationError(
      `Invalid payload for "${type}": ${payload.error.message}`,
      raw,
      payload.error,
    );
  }

  return {
    ...base.data,
    type,
    payload: payload.data,
  } as EventEnvelope;
}

/** Validate a payload against its schema, applying defaults. */
export function parsePayload<T extends EventType>(type: T, payload: unknown): PayloadOf<T> {
  const result = EVENT_REGISTRY[type].schema.safeParse(payload);
  if (!result.success) {
    throw new EventValidationError(
      `Invalid payload for "${type}": ${result.error.message}`,
      payload,
      result.error,
    );
  }
  return result.data as PayloadOf<T>;
}

/**
 * The Kafka message key, which decides the partition.
 *
 * Keying by correlationId (the job id) is what makes per-job ordering work:
 * same key -> same partition -> guaranteed order. Without a key Kafka
 * round-robins and a `completed` event can overtake a `progress` event.
 */
export function partitionKeyFor(envelope: EventEnvelope): string | undefined {
  return envelope.correlationId;
}
