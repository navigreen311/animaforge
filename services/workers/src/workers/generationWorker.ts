import { Worker, Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  GenerationResult,
  calculateProgress,
  updateJobStatus,
  simulateWork,
} from "../utils/jobHelpers.js";

/* ---------- Pipeline stages (11 stages) ---------- */

const GENERATION_STAGES: StageDefinition[] = [
  { name: "validate_input", weight: 3 },
  { name: "load_model", weight: 8 },
  { name: "preprocess_assets", weight: 7 },
  { name: "generate_keyframes", weight: 12 },
  { name: "interpolate_frames", weight: 15 },
  { name: "apply_style", weight: 10 },
  { name: "render_audio", weight: 10 },
  { name: "composite_layers", weight: 10 },
  { name: "post_process", weight: 8 },
  { name: "quality_check", weight: 7 },
  { name: "upload_output", weight: 10 },
];

/* ---------- Supported generation types ---------- */

export type GenerationType =
  | "video"
  | "audio"
  | "avatar"
  | "style_clone"
  | "img_to_cartoon";

interface GenerationJobData {
  type: GenerationType;
  project_id: string;
  user_id: string;
  params: Record<string, unknown>;
}

/* ---------- Processor ---------- */

async function processGeneration(job: Job<GenerationJobData>): Promise<GenerationResult> {
  const { type, project_id } = job.data;

  await updateJobStatus(job, "init", "queued", 0);
  await updateJobStatus(job, GENERATION_STAGES[0].name, "running", 0);

  for (let i = 0; i < GENERATION_STAGES.length; i++) {
    const stage = GENERATION_STAGES[i];
    const progress = calculateProgress(GENERATION_STAGES, i);

    await updateJobStatus(job, stage.name, "running", progress);

    // Simulate processing time proportional to stage weight
    await simulateWork(stage.weight * 10);
  }

  const outputId = uuidv4();
  const result: GenerationResult = {
    output_url: `https://cdn.animaforge.io/outputs/${project_id}/${type}/${outputId}.mp4`,
    quality_scores: {
      overall: +(0.85 + Math.random() * 0.14).toFixed(3),
      fidelity: +(0.82 + Math.random() * 0.17).toFixed(3),
      consistency: +(0.80 + Math.random() * 0.19).toFixed(3),
    },
  };

  await updateJobStatus(job, "done", "complete", 100);
  return result;
}

/* ---------- Worker factory ---------- */

export function createGenerationWorker(concurrency = 3): Worker<GenerationJobData, GenerationResult> {
  const worker = new Worker<GenerationJobData, GenerationResult>(
    "generation",
    processGeneration,
    {
      connection: redisConnection,
      concurrency,
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[generation] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[generation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
