import { Queue } from 'bullmq';

/**
 * The producer side of the generation queue.
 *
 * `services/workers` declares five BullMQ queues and runs a 600-line consumer
 * for this one — polling the AI service, running the governance pipeline,
 * writing status transitions. What did not exist anywhere was a producer:
 * outside `workers.test.ts`, nothing in the repository ever called
 * `generationQueue.add()`, so the queue was permanently empty and
 * /render-queue had nothing to show (#80).
 *
 * The producer lives here rather than in services/workers for two reasons.
 * platform-api is the single writer for `generation_jobs` (docs/persistence.md
 * §2), and it is where the authenticated HTTP surface is; and importing across
 * service boundaries would mean resolving `@animaforge/workers` through its
 * built `dist/`, which source-mode tooling cannot do.
 *
 * What the two services share is not code, it is a contract:
 *
 *   queue name  'generation'
 *   job name    'generate'
 *   payload     { type, project_id, user_id, params, tier, priority? }
 *   jobId       the generation_jobs row id
 *
 * That payload shape is `GenerationJobData` in
 * services/workers/src/workers/generationWorker.ts. Changing one side without
 * the other breaks the pipeline silently — the job would be accepted and then
 * fail inside the worker — so the shape is pinned by a test in both places.
 */

const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? undefined;

/** Matches services/workers/src/queues/index.ts. */
export const GENERATION_QUEUE_NAME = 'generation';

export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

let queue: Queue | null = null;

/**
 * The queue handle, created on first use.
 *
 * Lazily, because constructing a Queue opens a Redis connection: at module
 * load every test file that imports a router would open one and then hang the
 * process on exit.
 */
export function generationQueue(): Queue {
  if (!queue) {
    queue = new Queue(GENERATION_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86_400, count: 500 },
        removeOnFail: { age: 604_800, count: 1000 },
      },
    });
  }
  return queue;
}

/** Close the connection. Used by tests and by graceful shutdown. */
export async function closeGenerationQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

export interface EnqueueGenerationInput {
  jobId: string;
  type: string;
  projectId: string;
  userId: string;
  params: Record<string, unknown>;
  tier: string;
  /** Higher runs sooner, 1-10. */
  priority?: number;
}

/** Map a caller-facing priority (higher = sooner) onto BullMQ's (lower = sooner). */
function bullPriority(priority: number | undefined): number | undefined {
  if (priority === undefined) return undefined;
  const clamped = Math.max(1, Math.min(10, Math.round(priority)));
  return 11 - clamped;
}

/**
 * Put a job on the queue under the id of its `generation_jobs` row.
 *
 * Using the row id as the BullMQ job id is what keeps the console's view and
 * the queue's view of a job in one place: every status transition the worker
 * writes lands on the row the console is already displaying.
 */
export async function enqueueGeneration(input: EnqueueGenerationInput): Promise<void> {
  await generationQueue().add(
    'generate',
    {
      type: input.type,
      project_id: input.projectId,
      user_id: input.userId,
      params: input.params,
      tier: input.tier,
      priority: input.priority,
    },
    { jobId: input.jobId, priority: bullPriority(input.priority) },
  );
}
