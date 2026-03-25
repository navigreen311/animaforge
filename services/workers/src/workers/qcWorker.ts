import { Worker, Job } from "bullmq";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  calculateProgress,
  updateJobStatus,
  simulateWork,
} from "../utils/jobHelpers.js";

/* ---------- Constants ---------- */

const QC_THRESHOLDS = {
  lpips: 0.15, // temporal LPIPS — lower is better
  identityDrift: 0.10, // identity drift — lower is better
  lipSyncScore: 0.75, // lip sync accuracy — higher is better
  artifactScore: 0.90, // artifact-free score — higher is better
};

const BORDERLINE_MARGIN = 0.05;

const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_URL ?? "http://localhost:3003";

/* ---------- Pipeline stages ---------- */

const QC_STAGES: StageDefinition[] = [
  { name: "validate_input", weight: 5 },
  { name: "temporal_lpips", weight: 25 },
  { name: "identity_drift", weight: 25 },
  { name: "lip_sync_check", weight: 20 },
  { name: "artifact_detection", weight: 15 },
  { name: "generate_report", weight: 10 },
];

/* ---------- Types ---------- */

interface QcJobData {
  job_id: string;
  output_url: string;
  project_id: string;
  user_id: string;
  content_type: "video" | "audio" | "avatar";
  reference_urls?: string[];
}

interface QcCheckResult {
  name: string;
  score: number;
  threshold: number;
  passed: boolean;
  borderline: boolean;
}

interface QcReport {
  job_id: string;
  checks: QcCheckResult[];
  overall_passed: boolean;
  requires_human_review: boolean;
  certificate_id: string | null;
  reviewed_at: string;
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
      "[qc] Failed to emit realtime event " + event + ":",
      err instanceof Error ? err.message : err,
    );
  }
}

/* ---------- QC check simulators ---------- */

function runTemporalLpips(): QcCheckResult {
  const score = +(Math.random() * 0.25).toFixed(4);
  const passed = score <= QC_THRESHOLDS.lpips;
  const borderline =
    !passed && score <= QC_THRESHOLDS.lpips + BORDERLINE_MARGIN;
  return {
    name: "temporal_lpips",
    score,
    threshold: QC_THRESHOLDS.lpips,
    passed: passed || borderline,
    borderline,
  };
}

function runIdentityDrift(): QcCheckResult {
  const score = +(Math.random() * 0.20).toFixed(4);
  const passed = score <= QC_THRESHOLDS.identityDrift;
  const borderline =
    !passed && score <= QC_THRESHOLDS.identityDrift + BORDERLINE_MARGIN;
  return {
    name: "identity_drift",
    score,
    threshold: QC_THRESHOLDS.identityDrift,
    passed: passed || borderline,
    borderline,
  };
}

function runLipSyncCheck(): QcCheckResult {
  const score = +(0.5 + Math.random() * 0.5).toFixed(4);
  const passed = score >= QC_THRESHOLDS.lipSyncScore;
  const borderline =
    !passed && score >= QC_THRESHOLDS.lipSyncScore - BORDERLINE_MARGIN;
  return {
    name: "lip_sync",
    score,
    threshold: QC_THRESHOLDS.lipSyncScore,
    passed: passed || borderline,
    borderline,
  };
}

function runArtifactDetection(): QcCheckResult {
  const score = +(0.7 + Math.random() * 0.3).toFixed(4);
  const passed = score >= QC_THRESHOLDS.artifactScore;
  const borderline =
    !passed && score >= QC_THRESHOLDS.artifactScore - BORDERLINE_MARGIN;
  return {
    name: "artifact_detection",
    score,
    threshold: QC_THRESHOLDS.artifactScore,
    passed: passed || borderline,
    borderline,
  };
}

/* ---------- Processor ---------- */

async function processQc(job: Job<QcJobData>): Promise<QcReport> {
  const { job_id, project_id, user_id, content_type } = job.data;
  const jobId = job.id!;

  try {
    // Stage 0: Validate input
    await updateJobStatus(job, "validate_input", "running", 0);
    await emitRealtimeEvent(user_id, "qc:started", {
      jobId,
      targetJobId: job_id,
      projectId: project_id,
    });

    const checks: QcCheckResult[] = [];

    // Stage 1: Temporal LPIPS
    const stg1Progress = calculateProgress(QC_STAGES, 1);
    await updateJobStatus(job, "temporal_lpips", "running", stg1Progress);
    await simulateWork(200);
    checks.push(runTemporalLpips());

    // Stage 2: Identity drift
    const stg2Progress = calculateProgress(QC_STAGES, 2);
    await updateJobStatus(job, "identity_drift", "running", stg2Progress);
    await simulateWork(200);
    checks.push(runIdentityDrift());

    // Stage 3: Lip sync (video only)
    const stg3Progress = calculateProgress(QC_STAGES, 3);
    await updateJobStatus(job, "lip_sync_check", "running", stg3Progress);
    await simulateWork(150);
    if (content_type === "video") {
      checks.push(runLipSyncCheck());
    }

    // Stage 4: Artifact detection
    const stg4Progress = calculateProgress(QC_STAGES, 4);
    await updateJobStatus(job, "artifact_detection", "running", stg4Progress);
    await simulateWork(150);
    checks.push(runArtifactDetection());

    // Stage 5: Generate report
    const stg5Progress = calculateProgress(QC_STAGES, 5);
    await updateJobStatus(job, "generate_report", "running", stg5Progress);

    const allPassed = checks.every((c) => c.passed);
    const hasBorderline = checks.some((c) => c.borderline);
    const requiresHumanReview = hasBorderline || !allPassed;

    const certificateId = allPassed && !hasBorderline
      ? "qc-cert-" + crypto.randomUUID().slice(0, 12)
      : null;

    const report: QcReport = {
      job_id,
      checks,
      overall_passed: allPassed,
      requires_human_review: requiresHumanReview,
      certificate_id: certificateId,
      reviewed_at: new Date().toISOString(),
    };

    await updateJobStatus(job, "done", "complete", 100);

    await emitRealtimeEvent(user_id, "qc:completed", {
      jobId,
      targetJobId: job_id,
      passed: allPassed,
      requiresHumanReview,
      certificateId,
      checks: checks.map((c) => ({
        name: c.name,
        score: c.score,
        passed: c.passed,
        borderline: c.borderline,
      })),
    });

    if (requiresHumanReview) {
      console.log(
        "[qc] Job " + job_id + " flagged for human review — borderline scores detected",
      );
    }

    return report;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await emitRealtimeEvent(user_id, "qc:failed", {
      jobId,
      targetJobId: job_id,
      error: errorMsg,
    });

    throw err;
  }
}

/* ---------- Worker factory ---------- */

export function createQcWorker(
  concurrency = 5,
): Worker<QcJobData, QcReport> {
  const worker = new Worker<QcJobData, QcReport>(
    "qc",
    processQc,
    {
      connection: redisConnection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log("[qc] Job " + job.id + " completed");
  });

  worker.on("failed", (job, err) => {
    console.error("[qc] Job " + (job?.id) + " failed:", err.message);
  });

  return worker;
}
