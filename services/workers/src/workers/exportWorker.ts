import { Worker, Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  calculateProgress,
  updateJobStatus,
  createJobRecord,
  markComplete,
  markFailed,
} from "../utils/jobHelpers.js";

/* ---------- Constants ---------- */

const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_URL ?? "http://localhost:3003";

/* ---------- Pipeline stages ---------- */

const EXPORT_STAGES: StageDefinition[] = [
  { name: "validate_format", weight: 10 },
  { name: "create_export_record", weight: 5 },
  { name: "transcode", weight: 40 },
  { name: "package_assets", weight: 20 },
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
  resolution: string;
  codec: string;
  duration_ms: number;
  exported_at: string;
}

/* ---------- Codec / metadata helpers ---------- */

function resolveCodec(format: ExportFormat): string {
  switch (format) {
    case "mp4":
      return "h264";
    case "webm":
      return "vp9";
    case "gif":
      return "gif";
    case "png_sequence":
      return "png";
    case "wav":
      return "pcm_s16le";
  }
}

function resolveResolution(
  format: ExportFormat,
  requested?: string,
): string {
  if (requested) return requested;
  if (format === "gif") return "480x480";
  if (format === "wav") return "n/a";
  return "1920x1080";
}

/* ---------- WebSocket event emitter ---------- */

async function emitRealtimeEvent(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(REALTIME_SERVICE_URL + "/internal/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, event, payload }),
    });
  } catch (err) {
    console.warn(
      "[export] Failed to emit realtime event " + event + ":",
      err instanceof Error ? err.message : err,
    );
  }
}

/* ---------- Processor ---------- */

async function processExport(
  job: Job<ExportJobData>,
): Promise<ExportResult> {
  const { project_id, user_id, format, resolution, quality } = job.data;
  const jobId = job.id!;
  const startTime = Date.now();

  try {
    // Stage 0: Validate format
    await updateJobStatus(job, "validate_format", "running", 0);
    await emitRealtimeEvent(user_id, "export:started", {
      jobId,
      format,
      projectId: project_id,
    });

    // Stage 1: Create DB record for export tracking
    const stg1Progress = calculateProgress(EXPORT_STAGES, 1);
    await updateJobStatus(job, "create_export_record", "running", stg1Progress);

    await createJobRecord({
      id: jobId,
      projectId: project_id,
      userId: user_id,
      jobType: "export_" + format,
      inputParams: {
        sourceUrl: job.data.source_url,
        format,
        resolution: resolution ?? "1920x1080",
        quality: quality ?? "standard",
      },
    });

    // Stages 2-4: Transcode, package, upload
    for (let i = 2; i < EXPORT_STAGES.length; i++) {
      const stage = EXPORT_STAGES[i];
      const progress = calculateProgress(EXPORT_STAGES, i);

      await updateJobStatus(job, stage.name, "running", progress);
      await emitRealtimeEvent(user_id, "export:progress", {
        jobId,
        stage: stage.name,
        progress,
      });

      // Simulate processing time proportional to stage weight
      await new Promise((r) => setTimeout(r, stage.weight * 10));
    }

    // Build export metadata
    const outputId = uuidv4();
    const ext = format === "png_sequence" ? "zip" : format;
    const resolvedResolution = resolveResolution(format, resolution);
    const codec = resolveCodec(format);
    const durationMs = Date.now() - startTime;

    const downloadUrl = "https://cdn.animaforge.io/exports/" + project_id + "/" + outputId + "." + ext;

    const result: ExportResult = {
      download_url: downloadUrl,
      file_size_bytes: Math.floor(1_000_000 + Math.random() * 50_000_000),
      format,
      resolution: resolvedResolution,
      codec,
      duration_ms: durationMs,
      exported_at: new Date().toISOString(),
    };

    // Mark complete in DB
    await markComplete(jobId, downloadUrl, {
      exportFormat: format as unknown as number,
      resolution: resolvedResolution as unknown as number,
      codec: codec as unknown as number,
      fileSizeBytes: result.file_size_bytes,
      durationMs: durationMs,
    });

    await updateJobStatus(job, "done", "complete", 100);

    await emitRealtimeEvent(user_id, "export:completed", {
      jobId,
      downloadUrl,
      format,
      resolution: resolvedResolution,
      codec,
      fileSizeBytes: result.file_size_bytes,
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await markFailed(jobId, errorMsg);

    await emitRealtimeEvent(user_id, "export:failed", {
      jobId,
      error: errorMsg,
    });

    throw err;
  }
}

/* ---------- Worker factory ---------- */

export function createExportWorker(
  concurrency = 3,
): Worker<ExportJobData, ExportResult> {
  const worker = new Worker<ExportJobData, ExportResult>(
    "export",
    processExport,
    {
      connection: redisConnection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log("[export] Job " + job.id + " completed");
  });

  worker.on("failed", (job, err) => {
    console.error("[export] Job " + (job?.id) + " failed:", err.message);
  });

  return worker;
}
