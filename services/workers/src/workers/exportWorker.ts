import { Worker, Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  calculateProgress,
  updateJobStatus,
  simulateWork,
} from "../utils/jobHelpers.js";

/* ---------- Pipeline stages ---------- */

const EXPORT_STAGES: StageDefinition[] = [
  { name: "validate_format", weight: 10 },
  { name: "transcode", weight: 40 },
  { name: "package_assets", weight: 25 },
  { name: "upload_to_cdn", weight: 25 },
];

export type ExportFormat = "mp4" | "webm" | "gif" | "png_sequence" | "wav";

interface ExportJobData {
  source_url: string;
  project_id: string;
  user_id: string;
  format: ExportFormat;
  resolution?: string;
  quality?: "draft" | "standard" | "high";
}

interface ExportResult {
  download_url: string;
  file_size_bytes: number;
  format: ExportFormat;
  duration_ms: number;
  exported_at: string;
}

/* ---------- Processor ---------- */

async function processExport(job: Job<ExportJobData>): Promise<ExportResult> {
  const { project_id, format } = job.data;
  const startTime = Date.now();

  await updateJobStatus(job, "init", "queued", 0);

  for (let i = 0; i < EXPORT_STAGES.length; i++) {
    const stage = EXPORT_STAGES[i];
    const progress = calculateProgress(EXPORT_STAGES, i);

    await updateJobStatus(job, stage.name, "running", progress);
    await simulateWork(stage.weight * 10);
  }

  const outputId = uuidv4();
  const ext = format === "png_sequence" ? "zip" : format;

  const result: ExportResult = {
    download_url: `https://cdn.animaforge.io/exports/${project_id}/${outputId}.${ext}`,
    file_size_bytes: Math.floor(1_000_000 + Math.random() * 50_000_000),
    format,
    duration_ms: Date.now() - startTime,
    exported_at: new Date().toISOString(),
  };

  await updateJobStatus(job, "done", "complete", 100);
  return result;
}

/* ---------- Worker factory ---------- */

export function createExportWorker(concurrency = 3): Worker<ExportJobData, ExportResult> {
  const worker = new Worker<ExportJobData, ExportResult>(
    "export",
    processExport,
    {
      connection: redisConnection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[export] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[export] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
