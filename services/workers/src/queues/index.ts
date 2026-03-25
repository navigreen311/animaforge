import { Queue, QueueOptions } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST ?? "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? undefined;

export const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

const defaultQueueOpts: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86_400, count: 500 },
    removeOnFail: { age: 604_800, count: 1000 },
  },
};

export const generationQueue = new Queue("generation", defaultQueueOpts);
export const governanceQueue = new Queue("governance", defaultQueueOpts);
export const exportQueue = new Queue("export", defaultQueueOpts);
export const qcQueue = new Queue("qc", defaultQueueOpts);
export const cleanupQueue = new Queue("cleanup", defaultQueueOpts);

export const allQueues = [
  generationQueue,
  governanceQueue,
  exportQueue,
  qcQueue,
  cleanupQueue,
] as const;
