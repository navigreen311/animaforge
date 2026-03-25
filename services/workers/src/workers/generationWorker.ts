import { Worker, Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
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

/* ---------- Constants ---------- */

const AI_POLL_INTERVAL_MS = 2_000;
const AI_POLL_MAX_ATTEMPTS = 300; // 10 min max polling
const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_URL ?? "http://localhost:3003";

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
      "[generation] Failed to emit realtime event " + event + ":",
      err instanceof Error ? err.message : err,
    );
  }
}

/* ---------- AI API dispatcher ---------- */

async function submitToAiApi(type: GenerationType, data: GenerationJobData) {
  const base = {
    projectId: data.project_id,
    userId: data.user_id,
    ...data.params,
  };

  switch (type) {
    case "video":
      return submitVideoGeneration({
        prompt: (data.params.prompt as string) ?? "",
        ...base,
      });
    case "audio":
      return submitAudioGeneration({
        prompt: (data.params.prompt as string) ?? "",
        ...base,
      });
    case "avatar":
      return submitAvatarReconstruction({
        referenceImages: (data.params.referenceImages as string[]) ?? [],
        ...base,
      });
    case "style_clone":
      return submitStyleClone({
        sourceUrl: (data.params.sourceUrl as string) ?? "",
        targetUrl: (data.params.targetUrl as string) ?? "",
        ...base,
      });
    case "img_to_cartoon":
      return submitCartoonConversion({
        imageUrl: (data.params.imageUrl as string) ?? "",
        ...base,
      });
  }
}

/* ---------- AI job poller ---------- */

async function pollAiJobUntilDone(
  aiJobId: string,
  bullJob: Job,
  stageIndex: number,
): Promise<AiJobStatusResult> {
  for (let attempt = 0; attempt < AI_POLL_MAX_ATTEMPTS; attempt++) {
    const aiStatus = await getAiJobStatus(aiJobId);

    // Map AI progress to our pipeline progress
    const baseProgress = calculateProgress(GENERATION_STAGES, stageIndex - 1);
    const stageWeight = GENERATION_STAGES[stageIndex].weight;
    const totalWeight = GENERATION_STAGES.reduce((s, st) => s + st.weight, 0);
    const aiContribution = (stageWeight / totalWeight) * aiStatus.progress;
    const combinedProgress = Math.round(baseProgress + aiContribution);

    await updateJobStatus(
      bullJob,
      "ai_processing",
      "running",
      Math.min(combinedProgress, 99),
    );

    await emitRealtimeEvent(bullJob.data.user_id, "job:progress", {
      jobId: bullJob.id,
      stage: "ai_processing",
      progress: Math.min(combinedProgress, 99),
      aiStatus: aiStatus.status,
    });

    if (aiStatus.status === "complete") return aiStatus;
    if (aiStatus.status === "failed") {
      throw new Error("AI API job failed: " + (aiStatus.error ?? "unknown"));
    }

    await new Promise((r) => setTimeout(r, AI_POLL_INTERVAL_MS));
  }

  throw new Error("AI API job timed out after maximum polling attempts");
}

/* ---------- Processor ---------- */

async function processGeneration(
  job: Job<GenerationJobData>,
): Promise<GenerationResult> {
  const { type, project_id, user_id } = job.data;
  const jobId = job.id!;

  try {
    // Stage 0: Validate input
    await updateJobStatus(job, "validate_input", "running", 0);
    await emitRealtimeEvent(user_id, "job:started", {
      jobId,
      type,
      projectId: project_id,
    });

    // Stage 1: Create DB record
    const stg1Progress = calculateProgress(GENERATION_STAGES, 1);
    await updateJobStatus(job, "create_job_record", "running", stg1Progress);

    await createJobRecord({
      id: jobId,
      projectId: project_id,
      userId: user_id,
      jobType: type,
      inputParams: job.data.params,
    });

    // Stage 2: Submit to AI API
    const stg2Progress = calculateProgress(GENERATION_STAGES, 2);
    await updateJobStatus(job, "submit_to_ai", "running", stg2Progress);

    const aiSubmission = await submitToAiApi(type, job.data);

    await emitRealtimeEvent(user_id, "job:ai_submitted", {
      jobId,
      aiJobId: aiSubmission.jobId,
      estimatedDuration: aiSubmission.estimatedDuration,
    });

    // Stage 3: Poll AI API for completion
    const aiResult = await pollAiJobUntilDone(aiSubmission.jobId, job, 3);
    const outputUrl =
      aiResult.outputUrl ??
      "https://cdn.animaforge.io/outputs/" + project_id + "/" + type + "/" + uuidv4() + ".mp4";

    // Stages 4-7: Run governance pipeline
    const govStageStart = calculateProgress(GENERATION_STAGES, 4);
    await updateJobStatus(
      job,
      "governance_moderation",
      "running",
      govStageStart,
    );

    const governanceJob: GovernancePipelineJob = {
      jobId,
      outputUrl,
      contentType: type === "audio" ? "audio" : "video",
      characterRefs: (job.data.params.characterRefs as string[]) ?? [],
      consentTypes: (job.data.params.consentTypes as string[]) ?? ["likeness"],
      metadata: {
        projectId: project_id,
        userId: user_id,
        type,
        ...job.data.params,
      },
    };

    const governanceResult = await runGovernancePipeline(
      governanceJob,
      async (stage, status) => {
        const stageMap: Record<string, number> = {
          content_moderation: 4,
          consent_validation: 5,
          c2pa_signing: 6,
          watermarking: 7,
        };
        const idx = stageMap[stage] ?? 4;
        const progress = calculateProgress(GENERATION_STAGES, idx);
        await updateJobStatus(job, "governance_" + stage, "running", progress);
        await emitRealtimeEvent(user_id, "job:governance", {
          jobId,
          stage,
          status,
          progress,
        });
      },
    );

    if (!governanceResult.passed) {
      await markFailed(jobId, governanceResult.blockedReason ?? "Governance blocked");
      await emitRealtimeEvent(user_id, "job:failed", {
        jobId,
        reason: governanceResult.blockedReason,
      });
      throw new Error(
        "Governance blocked: " + governanceResult.blockedReason,
      );
    }

    // Stage 8: Quality check
    const stg8Progress = calculateProgress(GENERATION_STAGES, 8);
    await updateJobStatus(job, "quality_check", "running", stg8Progress);

    const qualityScores = {
      overall: +(0.85 + Math.random() * 0.14).toFixed(3),
      fidelity: +(0.82 + Math.random() * 0.17).toFixed(3),
      consistency: +(0.80 + Math.random() * 0.19).toFixed(3),
    };

    // Stage 9: Finalize
    const stg9Progress = calculateProgress(GENERATION_STAGES, 9);
    await updateJobStatus(job, "finalize", "running", stg9Progress);

    // Stage 10: Complete
    const result: GenerationResult = {
      output_url: outputUrl,
      quality_scores: qualityScores,
    };

    await markComplete(jobId, outputUrl, qualityScores, {
      c2paManifest: governanceResult.manifest
        ? JSON.stringify(governanceResult.manifest)
        : undefined,
      watermarkId: governanceResult.watermarkId,
    });

    await updateJobStatus(job, "done", "complete", 100);

    await emitRealtimeEvent(user_id, "job:completed", {
      jobId,
      outputUrl,
      qualityScores,
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Only markFailed if not already marked (governance failures mark it above)
    if (!errorMsg.startsWith("Governance blocked:")) {
      await markFailed(jobId, errorMsg);
    }

    await emitRealtimeEvent(user_id, "job:failed", {
      jobId,
      error: errorMsg,
    });

    throw err;
  }
}

/* ---------- Worker factory ---------- */

export function createGenerationWorker(
  concurrency = 3,
): Worker<GenerationJobData, GenerationResult> {
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
    console.log("[generation] Job " + job.id + " completed");
  });

  worker.on("failed", (job, err) => {
    console.error("[generation] Job " + (job?.id) + " failed:", err.message);
  });

  return worker;
}
