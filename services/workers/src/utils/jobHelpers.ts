import { Job } from "bullmq";

export type JobStatus = "queued" | "running" | "complete" | "failed";

export interface StageDefinition {
  name: string;
  weight: number;
}

export interface StatusUpdate {
  status: JobStatus;
  stage: string;
  progress: number;
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

export function simulateWork(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
