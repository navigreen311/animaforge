import { Job } from "bullmq";

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

/* ---------- Status update helper ---------- */

/**
 * Push a status update onto the job's log and update progress.
 */
export async function updateJobStatus(
  job: Job,
  stage: string,
  status: JobStatus,
  progress: number,
): Promise<void> {
  const update: StatusUpdate = {
    status,
    stage,
    progress,
    timestamp: new Date().toISOString(),
  };
  await job.updateProgress(progress);
  await job.log(JSON.stringify(update));
}

/* ---------- Simulation helper ---------- */

/**
 * Simulate async work for a given duration (ms).
 * In production this would be replaced by real processing calls.
 */
export function simulateWork(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
