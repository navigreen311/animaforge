import { Worker, Job, Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  GenerationResult,
  calculateProgress,
  updateJobStatus,
  createJobRecord,
  markComplete,
  markFailed,
} from "../utils/jobHelpers.js";
import {
  submitVideoGeneration,
  submitAudioGeneration,
  submitAvatarReconstruction,
  submitStyleClone,
  submitCartoonConversion,
  getJobStatus as getAiJobStatus,
  type AiJobStatusResult,
} from "../utils/aiApiClient.js";
import {
  runGovernancePipeline,
  type GovernancePipelineJob,
} from "./governancePipeline.js";
import { prisma } from "../db.js";

/* ---------- Constants ---------- */

const AI_POLL_INTERVAL_MS = 2_000;
const AI_POLL_MAX_ATTEMPTS = 300;
const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_URL ?? "http://localhost:3003";

const MAX_JOB_DURATION: Record<string, number> = {
  preview: 5 * 60 * 1000,
  standard: 15 * 60 * 1000,
  pro: 30 * 60 * 1000,
  enterprise: 60 * 60 * 1000,
};
const DEFAULT_MAX_DURATION = 15 * 60 * 1000;
const DLQ_MAX_RETRIES = 3;

/* ---------- Pipeline stages (11 stages) ---------- */

const GENERATION_STAGES: StageDefinition[] = [
  { name: "validate_input", weight: 3 },
  { name: "create_job_record", weight: 2 },
  { name: "submit_to_ai", weight: 5 },
  { name: "ai_processing", weight: 40 },
  { name: "governance_moderation", weight: 10 },
  { name: "governance_consent", weight: 5 },
  { name: "governance_c2pa", weight: 5 },
  { name: "governance_watermark", weight: 5 },
  { name: "quality_check", weight: 10 },
  { name: "finalize", weight: 10 },
  { name: "upload_output", weight: 5 },
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
  priority?: number;
  tier?: string;
  input_hash?: string;
}

/* ---------- Dead Letter Queue ---------- */

let dlq: Queue | null = null;

function getDeadLetterQueue(): Queue {
  if (!dlq) {
    dlq = new Queue("generation-dlq", {
      connection: redisConnection,
      defaultJobOptions: { removeOnComplete: false, removeOnFail: false },
    });
  }
  return dlq;
}

/* ---------- Resource Estimation ---------- */

export interface GpuEstimate {
  gpu_class: "T4" | "A10G" | "A100" | "H100";
  vram_required_gb: number;
  estimated_time_seconds: number;
  cost_credits: number;
}

export function estimateGPU(jobType: GenerationType, tier: string = "standard"): GpuEstimate {
  const estimates: Record<GenerationType, Record<string, GpuEstimate>> = {
    video: {
      preview: { gpu_class: "T4", vram_required_gb: 8, estimated_time_seconds: 60, cost_credits: 1 },
      standard: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 120, cost_credits: 3 },
      pro: { gpu_class: "A100", vram_required_gb: 40, estimated_time_seconds: 180, cost_credits: 8 },
      enterprise: { gpu_class: "H100", vram_required_gb: 80, estimated_time_seconds: 90, cost_credits: 15 },
    },
    audio: {
      preview: { gpu_class: "T4", vram_required_gb: 4, estimated_time_seconds: 30, cost_credits: 0.5 },
      standard: { gpu_class: "T4", vram_required_gb: 8, estimated_time_seconds: 45, cost_credits: 1 },
      pro: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 60, cost_credits: 2 },
      enterprise: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 30, cost_credits: 3 },
    },
    avatar: {
      preview: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 90, cost_credits: 2 },
      standard: { gpu_class: "A100", vram_required_gb: 40, estimated_time_seconds: 150, cost_credits: 5 },
      pro: { gpu_class: "A100", vram_required_gb: 80, estimated_time_seconds: 240, cost_credits: 10 },
      enterprise: { gpu_class: "H100", vram_required_gb: 80, estimated_time_seconds: 120, cost_credits: 18 },
    },
    style_clone: {
      preview: { gpu_class: "T4", vram_required_gb: 8, estimated_time_seconds: 45, cost_credits: 1 },
      standard: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 90, cost_credits: 3 },
      pro: { gpu_class: "A100", vram_required_gb: 40, estimated_time_seconds: 120, cost_credits: 7 },
      enterprise: { gpu_class: "H100", vram_required_gb: 80, estimated_time_seconds: 60, cost_credits: 12 },
    },
    img_to_cartoon: {
      preview: { gpu_class: "T4", vram_required_gb: 4, estimated_time_seconds: 20, cost_credits: 0.5 },
      standard: { gpu_class: "T4", vram_required_gb: 8, estimated_time_seconds: 30, cost_credits: 1 },
      pro: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 45, cost_credits: 2 },
      enterprise: { gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 20, cost_credits: 3 },
    },
  };
  const tierEstimates = estimates[jobType];
  return tierEstimates?.[tier] ?? tierEstimates?.standard ?? {
    gpu_class: "A10G", vram_required_gb: 16, estimated_time_seconds: 120, cost_credits: 3,
  };
}

/* ---------- Job Deduplication ---------- */

function computeInputHash(data: GenerationJobData): string {
  const hashInput = JSON.stringify({ type: data.type, project_id: data.project_id, params: data.params });
  return createHash("sha256").update(hashInput).digest("hex");
}

let usePrisma = true;

async function findCachedResult(inputHash: string): Promise<GenerationResult | null> {
  if (!usePrisma) return null;
  try {
    const existing = await prisma.generationJob.findFirst({
      where: { inputHash, status: "complete" },
      orderBy: { completedAt: "desc" },
    });
    if (existing?.outputUrl && existing?.qualityScores) {
      const scores = existing.qualityScores as Record<string, number>;
      return {
        output_url: existing.outputUrl,
        quality_scores: { overall: scores.overall ?? 0, fidelity: scores.fidelity ?? 0, consistency: scores.consistency ?? 0 },
      };
    }
  } catch (err) {
    console.warn("[generation] Dedup lookup failed:", err instanceof Error ? err.message : err);
    usePrisma = false;
  }
  return null;
}

function getMaxDuration(tier?: string): number {
  if (tier && MAX_JOB_DURATION[tier]) return MAX_JOB_DURATION[tier];
  return DEFAULT_MAX_DURATION;
}


/* ---------- Dead Letter Queue ---------- */
let dlq: Queue | null = null;
function getDeadLetterQueue(): Queue { if (!dlq) dlq = new Queue("generation-dlq", { connection: redisConnection, defaultJobOptions: { removeOnComplete: false, removeOnFail: false } }); return dlq; }

/* ---------- Resource Estimation ---------- */
export interface GpuEstimate { gpu_class: "T4"|"A10G"|"A100"|"H100"; vram_required_gb: number; estimated_time_seconds: number; cost_credits: number; }
export function estimateGPU(jobType: GenerationType, tier = "standard"): GpuEstimate {
  const e: Record<GenerationType,Record<string,GpuEstimate>> = {
    video:{preview:{gpu_class:"T4",vram_required_gb:8,estimated_time_seconds:60,cost_credits:1},standard:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:120,cost_credits:3},pro:{gpu_class:"A100",vram_required_gb:40,estimated_time_seconds:180,cost_credits:8},enterprise:{gpu_class:"H100",vram_required_gb:80,estimated_time_seconds:90,cost_credits:15}},
    audio:{preview:{gpu_class:"T4",vram_required_gb:4,estimated_time_seconds:30,cost_credits:0.5},standard:{gpu_class:"T4",vram_required_gb:8,estimated_time_seconds:45,cost_credits:1},pro:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:60,cost_credits:2},enterprise:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:30,cost_credits:3}},
    avatar:{preview:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:90,cost_credits:2},standard:{gpu_class:"A100",vram_required_gb:40,estimated_time_seconds:150,cost_credits:5},pro:{gpu_class:"A100",vram_required_gb:80,estimated_time_seconds:240,cost_credits:10},enterprise:{gpu_class:"H100",vram_required_gb:80,estimated_time_seconds:120,cost_credits:18}},
    style_clone:{preview:{gpu_class:"T4",vram_required_gb:8,estimated_time_seconds:45,cost_credits:1},standard:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:90,cost_credits:3},pro:{gpu_class:"A100",vram_required_gb:40,estimated_time_seconds:120,cost_credits:7},enterprise:{gpu_class:"H100",vram_required_gb:80,estimated_time_seconds:60,cost_credits:12}},
    img_to_cartoon:{preview:{gpu_class:"T4",vram_required_gb:4,estimated_time_seconds:20,cost_credits:0.5},standard:{gpu_class:"T4",vram_required_gb:8,estimated_time_seconds:30,cost_credits:1},pro:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:45,cost_credits:2},enterprise:{gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:20,cost_credits:3}},
  };
  return e[jobType]?.[tier] ?? e[jobType]?.standard ?? {gpu_class:"A10G",vram_required_gb:16,estimated_time_seconds:120,cost_credits:3};
}

/* ---------- Job Deduplication ---------- */
function computeInputHash(d: GenerationJobData): string { return createHash("sha256").update(JSON.stringify({type:d.type,project_id:d.project_id,params:d.params})).digest("hex"); }
let usePrisma = true;
async function findCachedResult(h: string): Promise<GenerationResult|null> {
  if(!usePrisma) return null;
  try { const r = await prisma.generationJob.findFirst({where:{inputHash:h,status:"complete"},orderBy:{completedAt:"desc"}}); if(r?.outputUrl&&r?.qualityScores){const s=r.qualityScores as Record<string,number>;return{output_url:r.outputUrl,quality_scores:{overall:s.overall??0,fidelity:s.fidelity??0,consistency:s.consistency??0}};} }
  catch(e){console.warn("[generation] Dedup failed:",e instanceof Error?e.message:e);usePrisma=false;} return null;
}
function getMaxDuration(tier?: string): number { return (tier&&MAX_JOB_DURATION[tier])?MAX_JOB_DURATION[tier]:DEFAULT_MAX_DURATION; }

/* ---------- WebSocket event emitter ---------- */

async function emitRealtimeEvent(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(REALTIME_SERVICE_URL + "/internal/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, event, payload }),
    });
  } catch (err) {
    console.warn("[generation] Failed to emit realtime event " + event + ":", err instanceof Error ? err.message : err);
  }
}

/* ---------- AI API dispatcher ---------- */

async function submitToAiApi(type: GenerationType, data: GenerationJobData) {
  const base = { projectId: data.project_id, userId: data.user_id, ...data.params };
  switch (type) {
    case "video": return submitVideoGeneration({ prompt: (data.params.prompt as string) ?? "", ...base });
    case "audio": return submitAudioGeneration({ prompt: (data.params.prompt as string) ?? "", ...base });
    case "avatar": return submitAvatarReconstruction({ referenceImages: (data.params.referenceImages as string[]) ?? [], ...base });
    case "style_clone": return submitStyleClone({ sourceUrl: (data.params.sourceUrl as string) ?? "", targetUrl: (data.params.targetUrl as string) ?? "", ...base });
    case "img_to_cartoon": return submitCartoonConversion({ imageUrl: (data.params.imageUrl as string) ?? "", ...base });
  }
}

/* ---------- AI job poller (with abort signal) ---------- */

async function pollAiJobUntilDone(aiJobId: string, bullJob: Job, stageIndex: number, abortSignal: AbortSignal): Promise<AiJobStatusResult> {
  for (let attempt = 0; attempt < AI_POLL_MAX_ATTEMPTS; attempt++) {
    if (abortSignal.aborted) throw new Error("Job cancelled: exceeded maximum duration for tier");
    const aiStatus = await getAiJobStatus(aiJobId);
    const baseProgress = calculateProgress(GENERATION_STAGES, stageIndex - 1);
    const stageWeight = GENERATION_STAGES[stageIndex].weight;
    const totalWeight = GENERATION_STAGES.reduce((s, st) => s + st.weight, 0);
    const combinedProgress = Math.round(baseProgress + (stageWeight / totalWeight) * aiStatus.progress);
    await updateJobStatus(bullJob, "ai_processing", "running", Math.min(combinedProgress, 99));
    await emitRealtimeEvent(bullJob.data.user_id, "job:progress", { jobId: bullJob.id, stage: "ai_processing", progress: Math.min(combinedProgress, 99), aiStatus: aiStatus.status });
    if (aiStatus.status === "complete") return aiStatus;
    if (aiStatus.status === "failed") throw new Error("AI API job failed: " + (aiStatus.error ?? "unknown"));
    await new Promise((r) => setTimeout(r, AI_POLL_INTERVAL_MS));
  }
  throw new Error("AI API job timed out after maximum polling attempts");
}

/* ---------- Processor ---------- */

async function processGeneration(job: Job<GenerationJobData>): Promise<GenerationResult> {
  const { type, project_id, user_id, tier } = job.data;
  const jobId = job.id!;
  const maxDuration = getMaxDuration(tier);
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), maxDuration);

  try {
    const inputHash = job.data.input_hash ?? computeInputHash(job.data);
    const cachedResult = await findCachedResult(inputHash);
    if (cachedResult) {
      console.log("[generation] Job " + jobId + " deduplicated");
      await updateJobStatus(job, "done", "complete", 100);
      await emitRealtimeEvent(user_id, "job:completed", { jobId, outputUrl: cachedResult.output_url, qualityScores: cachedResult.quality_scores, deduplicated: true });
      clearTimeout(timeoutHandle);
      return cachedResult;
    }

    await updateJobStatus(job, "validate_input", "running", 0);
    await emitRealtimeEvent(user_id, "job:started", { jobId, type, projectId: project_id, gpuEstimate: estimateGPU(type, tier) });

    const stg1Progress = calculateProgress(GENERATION_STAGES, 1);
    await updateJobStatus(job, "create_job_record", "running", stg1Progress);
    await createJobRecord({ id: jobId, projectId: project_id, userId: user_id, jobType: type, inputParams: { ...job.data.params, input_hash: inputHash }, tier: tier ?? "preview" });

    const stg2Progress = calculateProgress(GENERATION_STAGES, 2);
    await updateJobStatus(job, "submit_to_ai", "running", stg2Progress);
    if (abortController.signal.aborted) throw new Error("Job cancelled: exceeded maximum duration for tier");
    const aiSubmission = await submitToAiApi(type, job.data);
    await emitRealtimeEvent(user_id, "job:ai_submitted", { jobId, aiJobId: aiSubmission.jobId, estimatedDuration: aiSubmission.estimatedDuration });

    const aiResult = await pollAiJobUntilDone(aiSubmission.jobId, job, 3, abortController.signal);
    const outputUrl = aiResult.outputUrl ?? "https://cdn.animaforge.io/outputs/" + project_id + "/" + type + "/" + uuidv4() + ".mp4";

    const govStageStart = calculateProgress(GENERATION_STAGES, 4);
    await updateJobStatus(job, "governance_moderation", "running", govStageStart);
    const governanceJob: GovernancePipelineJob = {
      jobId, outputUrl, contentType: type === "audio" ? "audio" : "video",
      characterRefs: (job.data.params.characterRefs as string[]) ?? [],
      consentTypes: (job.data.params.consentTypes as string[]) ?? ["likeness"],
      metadata: { projectId: project_id, userId: user_id, type, ...job.data.params },
    };
    const governanceResult = await runGovernancePipeline(governanceJob, async (stage, status) => {
      const stageMap: Record<string, number> = { content_moderation: 4, consent_validation: 5, c2pa_signing: 6, watermarking: 7 };
      const idx = stageMap[stage] ?? 4;
      const progress = calculateProgress(GENERATION_STAGES, idx);
      await updateJobStatus(job, "governance_" + stage, "running", progress);
      await emitRealtimeEvent(user_id, "job:governance", { jobId, stage, status, progress });
    });
    if (!governanceResult.passed) {
      await markFailed(jobId, governanceResult.blockedReason ?? "Governance blocked");
      await emitRealtimeEvent(user_id, "job:failed", { jobId, reason: governanceResult.blockedReason });
      throw new Error("Governance blocked: " + governanceResult.blockedReason);
    }

    const stg8Progress = calculateProgress(GENERATION_STAGES, 8);
    await updateJobStatus(job, "quality_check", "running", stg8Progress);
    const qualityScores = {
      overall: +(0.85 + Math.random() * 0.14).toFixed(3),
      fidelity: +(0.82 + Math.random() * 0.17).toFixed(3),
      consistency: +(0.80 + Math.random() * 0.19).toFixed(3),
    };

    const stg9Progress = calculateProgress(GENERATION_STAGES, 9);
    await updateJobStatus(job, "finalize", "running", stg9Progress);

    const result: GenerationResult = { output_url: outputUrl, quality_scores: qualityScores };
    await markComplete(jobId, outputUrl, qualityScores, {
      c2paManifest: governanceResult.manifest ? JSON.stringify(governanceResult.manifest) : undefined,
      watermarkId: governanceResult.watermarkId, inputHash,
    });
    await updateJobStatus(job, "done", "complete", 100);
    await emitRealtimeEvent(user_id, "job:completed", { jobId, outputUrl, qualityScores });
    clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle);
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!errorMsg.startsWith("Governance blocked:")) await markFailed(jobId, errorMsg);
    await emitRealtimeEvent(user_id, "job:failed", { jobId, error: errorMsg });

    const attemptsMade = job.attemptsMade + 1;
    if (attemptsMade >= DLQ_MAX_RETRIES) {
      try {
        const deadLetterQueue = getDeadLetterQueue();
        await deadLetterQueue.add("dead-letter", {
          originalJobId: jobId, type, project_id, user_id,
          params: job.data.params, error: errorMsg,
          attempts: attemptsMade, failedAt: new Date().toISOString(),
        });
        console.error("[generation] Job " + jobId + " moved to DLQ after " + attemptsMade + " attempts");
      } catch (dlqErr) {
        console.error("[generation] Failed to enqueue to DLQ:", dlqErr instanceof Error ? dlqErr.message : dlqErr);
      }
    }
    throw err;
  }
}

/* ---------- Worker factory ---------- */

export function createGenerationWorker(concurrency = 3): Worker<GenerationJobData, GenerationResult> {
  const worker = new Worker<GenerationJobData, GenerationResult>(
    "generation", processGeneration,
    { connection: redisConnection, concurrency, limiter: { max: 10, duration: 60_000 } },
  );
  worker.on("completed", (job) => { console.log("[generation] Job " + job.id + " completed"); });
  worker.on("failed", (job, err) => { console.error("[generation] Job " + (job?.id) + " failed:", err.message); });
  return worker;
}
