import { Worker, Job } from "bullmq";
import { redisConnection } from "../queues/index.js";
import { StageDefinition, calculateProgress, updateJobStatus, simulateWork } from "../utils/jobHelpers.js";

const QC_THRESHOLDS = { lpips: 0.15, identityDrift: 0.10, lipSyncScore: 0.75, artifactScore: 0.90 };
const BORDERLINE_MARGIN = 0.05;
const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL ?? "http://localhost:3003";

const QC_STAGES: StageDefinition[] = [
  { name: "validate_input", weight: 5 }, { name: "temporal_lpips", weight: 25 },
  { name: "identity_drift", weight: 25 }, { name: "lip_sync_check", weight: 20 },
  { name: "artifact_detection", weight: 15 }, { name: "generate_report", weight: 10 },
];

interface QcJobData { job_id: string; output_url: string; project_id: string; user_id: string; content_type: "video"|"audio"|"avatar"; reference_urls?: string[]; }
interface QcCheckResult { name: string; score: number; threshold: number; passed: boolean; borderline: boolean; }
interface QcReport { job_id: string; checks: QcCheckResult[]; overall_passed: boolean; requires_human_review: boolean; certificate_id: string|null; reviewed_at: string; }

async function emitRealtimeEvent(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  try { await fetch(REALTIME_SERVICE_URL + "/internal/emit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event, payload }) }); }
  catch (err) { console.warn("[qc] Failed to emit:", err instanceof Error ? err.message : err); }
}

function runCheck(name: string, score: number, threshold: number, lowerIsBetter: boolean): QcCheckResult {
  const passed = lowerIsBetter ? score <= threshold : score >= threshold;
  const borderline = !passed && (lowerIsBetter ? score <= threshold + BORDERLINE_MARGIN : score >= threshold - BORDERLINE_MARGIN);
  return { name, score, threshold, passed: passed || borderline, borderline };
}

async function processQc(job: Job<QcJobData>): Promise<QcReport> {
  const { job_id, project_id, user_id, content_type } = job.data;
  try {
    await updateJobStatus(job, "validate_input", "running", 0);
    await emitRealtimeEvent(user_id, "qc:started", { jobId: job.id, targetJobId: job_id, projectId: project_id });
    const checks: QcCheckResult[] = [];

    await updateJobStatus(job, "temporal_lpips", "running", calculateProgress(QC_STAGES, 1));
    await simulateWork(200);
    checks.push(runCheck("temporal_lpips", +(Math.random()*0.25).toFixed(4), QC_THRESHOLDS.lpips, true));

    await updateJobStatus(job, "identity_drift", "running", calculateProgress(QC_STAGES, 2));
    await simulateWork(200);
    checks.push(runCheck("identity_drift", +(Math.random()*0.20).toFixed(4), QC_THRESHOLDS.identityDrift, true));

    await updateJobStatus(job, "lip_sync_check", "running", calculateProgress(QC_STAGES, 3));
    await simulateWork(150);
    if (content_type === "video") checks.push(runCheck("lip_sync", +(0.5+Math.random()*0.5).toFixed(4), QC_THRESHOLDS.lipSyncScore, false));

    await updateJobStatus(job, "artifact_detection", "running", calculateProgress(QC_STAGES, 4));
    await simulateWork(150);
    checks.push(runCheck("artifact_detection", +(0.7+Math.random()*0.3).toFixed(4), QC_THRESHOLDS.artifactScore, false));

    await updateJobStatus(job, "generate_report", "running", calculateProgress(QC_STAGES, 5));
    const allPassed = checks.every(c => c.passed);
    const hasBorderline = checks.some(c => c.borderline);
    const requiresHumanReview = hasBorderline || !allPassed;
    const certificateId = allPassed && !hasBorderline ? "qc-cert-" + crypto.randomUUID().slice(0,12) : null;

    const report: QcReport = { job_id, checks, overall_passed: allPassed, requires_human_review: requiresHumanReview, certificate_id: certificateId, reviewed_at: new Date().toISOString() };
    await updateJobStatus(job, "done", "complete", 100);
    await emitRealtimeEvent(user_id, "qc:completed", { jobId: job.id, targetJobId: job_id, passed: allPassed, requiresHumanReview, certificateId });
    if (requiresHumanReview) console.log("[qc] Job " + job_id + " flagged for human review");
    return report;
  } catch (err) {
    await emitRealtimeEvent(user_id, "qc:failed", { jobId: job.id, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export function createQcWorker(concurrency = 5): Worker<QcJobData, QcReport> {
  const worker = new Worker<QcJobData, QcReport>("qc", processQc, { connection: redisConnection, concurrency });
  worker.on("completed", (job) => { console.log("[qc] Job " + job.id + " completed"); });
  worker.on("failed", (job, err) => { console.error("[qc] Job " + (job?.id) + " failed:", err.message); });
  return worker;
}
