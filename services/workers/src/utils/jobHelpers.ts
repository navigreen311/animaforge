import { Job } from "bullmq";
import { prisma } from "../db.js";

/* ---------- Types ---------- */

export type JobStatus = "queued" | "running" | "complete" | "failed";

export interface StageDefinition {
  name: string;
  weight: number; // relative weight for progress calculation
}

export interface StatusUpdate {
  status: JobStatus;
  stage: string;
  progress: number; // 0-100
  timestamp: string;
}

export interface GenerationResult {
  output_url: string;
  quality_scores: {
    overall: number;
    fidelity: number;
    consistency: number;
  };
}

export interface CreateJobData {
  id?: string;
  projectId: string;
  userId: string;
  jobType: string;
  modelId?: string;
  inputParams: Record<string, unknown>;
  tier?: string;
  shotId?: string;
}

/* ---------- In-memory fallback store ---------- */

const memoryStore = new Map<
  string,
  {
    id: string;
    status: JobStatus;
    progress: number;
    outputUrl?: string;
    qualityScores?: Record<string, number>;
    completedAt?: string;
    error?: string;
    [key: string]: unknown;
  }
>();

let usePrisma = true;

/**
 * Attempt a Prisma operation; fall back to in-memory on failure.
 */
async function withFallback<T>(
  prismaFn: () => Promise<T>,
  memoryFn: () => T,
): Promise<T> {
  if (!usePrisma) return memoryFn();

  try {
    return await prismaFn();
  } catch (err) {
    console.warn(
      "[jobHelpers] Prisma unavailable, falling back to in-memory store:",
      err instanceof Error ? err.message : err,
    );
    usePrisma = false;
    return memoryFn();
  }
}

/* ---------- Progress helpers ---------- */

/**
 * Calculate cumulative progress (0-100) based on completed stages.
 */
export function calculateProgress(
  stages: StageDefinition[],
  completedIndex: number,
): number {
  const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  let completedWeight = 0;
  for (let i = 0; i <= completedIndex && i < stages.length; i++) {
    completedWeight += stages[i].weight;
  }
  return Math.round((completedWeight / totalWeight) * 100);
}

/* ---------- CRUD operations ---------- */

/**
 * Create a new job record in the database.
 */
export async function createJobRecord(data: CreateJobData) {
  return withFallback(
    () =>
      prisma.generationJob.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          projectId: data.projectId,
          userId: data.userId,
          jobType: data.jobType,
          modelId: data.modelId ?? "default",
          inputParams: data.inputParams,
          tier: data.tier ?? "preview",
          shotId: data.shotId,
          status: "queued",
          progress: 0,
        },
      }),
    () => {
      const id = data.id ?? crypto.randomUUID();
      const record = {
        id,
        projectId: data.projectId,
        userId: data.userId,
        jobType: data.jobType,
        modelId: data.modelId ?? "default",
        inputParams: data.inputParams,
        tier: data.tier ?? "preview",
        status: "queued" as JobStatus,
        progress: 0,
        createdAt: new Date().toISOString(),
      };
      memoryStore.set(id, record);
      return record;
    },
  );
}

/**
 * Retrieve a job record by ID.
 */
export async function getJob(jobId: string) {
  return withFallback(
    () =>
      prisma.generationJob.findUnique({
        where: { id: jobId },
      }),
    () => memoryStore.get(jobId) ?? null,
  );
}

/**
 * Update job status, progress, and optional extra fields in the database.
 * Accepts either a BullMQ Job object or a plain job ID string.
 */
export async function updateJobStatus(
  jobOrId: Job | string,
  stage: string,
  status: JobStatus,
  progress: number,
  extra?: Record<string, unknown>,
): Promise<void> {
  const jobId =
    typeof jobOrId === "string" ? jobOrId : (jobOrId.id ?? jobOrId.name);

  // Update BullMQ job progress if a Job object was passed
  if (typeof jobOrId !== "string") {
    const update: StatusUpdate = {
      status,
      stage,
      progress,
      timestamp: new Date().toISOString(),
    };
    await jobOrId.updateProgress(progress);
    await jobOrId.log(JSON.stringify(update));
  }

  // Persist to database
  await withFallback(
    () =>
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status,
          progress,
          ...(status === "running" && !extra?.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...extra,
        },
      }),
    () => {
      const existing = memoryStore.get(jobId) ?? {
        id: jobId,
        status: "queued" as JobStatus,
        progress: 0,
      };
      memoryStore.set(jobId, {
        ...existing,
        status,
        progress,
        ...extra,
      });
    },
  );
}

/**
 * Mark a job as complete with output URL and quality scores.
 */
export async function markComplete(
  jobId: string,
  outputUrl: string,
  qualityScores: Record<string, number>,
  extra?: Record<string, unknown>,
): Promise<void> {
  await withFallback(
    () =>
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "complete",
          progress: 100,
          outputUrl,
          qualityScores,
          completedAt: new Date(),
          ...extra,
        },
      }),
    () => {
      const existing = memoryStore.get(jobId) ?? {
        id: jobId,
        status: "queued" as JobStatus,
        progress: 0,
      };
      memoryStore.set(jobId, {
        ...existing,
        status: "complete",
        progress: 100,
        outputUrl,
        qualityScores,
        completedAt: new Date().toISOString(),
        ...extra,
      });
    },
  );
}

/**
 * Mark a job as failed with an error message.
 */
export async function markFailed(jobId: string, error: string): Promise<void> {
  await withFallback(
    () =>
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          completedAt: new Date(),
        },
      }),
    () => {
      const existing = memoryStore.get(jobId) ?? {
        id: jobId,
        status: "queued" as JobStatus,
        progress: 0,
      };
      memoryStore.set(jobId, {
        ...existing,
        status: "failed",
        error,
        completedAt: new Date().toISOString(),
      });
    },
  );
}

/* ---------- Simulation helper ---------- */

/**
 * Simulate async work for a given duration (ms).
 * In production this would be replaced by real processing calls.
 */
export function simulateWork(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
