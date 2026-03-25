import { Job } from "bullmq";
import {
  moderateContent,
  validateConsent,
  signC2PA,
  embedWatermark,
} from "../utils/governanceClient.js";

/* ---------- Types ---------- */

export interface GovernancePipelineJob {
  jobId: string;
  outputUrl: string;
  contentType: string;
  characterRefs: string[];
  consentTypes: string[];
  metadata: Record<string, unknown>;
}

export interface GovernancePipelineResult {
  passed: boolean;
  manifest?: { manifestId: string; signature: string; signedAt: string };
  watermarkId?: string;
  blockedReason?: string;
}

type ProgressCallback = (stage: string, status: string) => void;

/* ---------- Constants ---------- */

const C2PA_MAX_RETRIES = 3;

/* ---------- Pipeline orchestrator ---------- */

/**
 * Run the full 4-stage governance pipeline sequentially:
 *  1. Content Moderation
 *  2. Consent Validation
 *  3. C2PA Signing
 *  4. Durable Watermarking
 */
export async function runGovernancePipeline(
  job: GovernancePipelineJob,
  onProgress?: ProgressCallback,
): Promise<GovernancePipelineResult> {
  const emit = onProgress ?? (() => {});

  // ── Stage 1: Content Moderation ──
  emit("content_moderation", "running");
  const moderationResult = await moderateContent(
    job.jobId,
    job.outputUrl,
    job.contentType,
  );
  if (!moderationResult.allowed) {
    emit("content_moderation", "blocked");
    return {
      passed: false,
      blockedReason: `Content blocked: ${moderationResult.categories.join(", ")}`,
    };
  }
  emit("content_moderation", "passed");

  // ── Stage 2: Consent Validation ──
  emit("consent_validation", "running");
  const consentResult = await validateConsent(
    job.characterRefs,
    job.consentTypes,
  );
  if (!consentResult.valid) {
    emit("consent_validation", "blocked");
    return {
      passed: false,
      blockedReason: `Missing consents: ${consentResult.missingConsents.join(", ")}`,
    };
  }
  emit("consent_validation", "passed");

  // ── Stage 3: C2PA Signing ──
  emit("c2pa_signing", "running");
  let manifest: GovernancePipelineResult["manifest"];
  let c2paSuccess = false;

  for (let attempt = 1; attempt <= C2PA_MAX_RETRIES; attempt++) {
    try {
      const signResult = await signC2PA({
        jobId: job.jobId,
        outputUrl: job.outputUrl,
        metadata: job.metadata,
      });
      manifest = {
        manifestId: signResult.manifestId,
        signature: signResult.signature,
        signedAt: signResult.signedAt,
      };
      c2paSuccess = true;
      break;
    } catch (err) {
      if (attempt === C2PA_MAX_RETRIES) {
        emit("c2pa_signing", "alert");
        return {
          passed: false,
          blockedReason: `C2PA signing failed after ${C2PA_MAX_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }
  emit("c2pa_signing", "passed");

  // ── Stage 4: Durable Watermarking ──
  emit("watermarking", "running");
  let watermarkId: string | undefined;
  try {
    const watermarkResult = await embedWatermark(
      job.jobId,
      job.outputUrl,
      job.metadata,
    );
    watermarkId = watermarkResult.watermarkId;
    emit("watermarking", "passed");
  } catch {
    emit("watermarking", "manual_review");
    // Watermark failure does not block — flagged for manual review
  }

  return {
    passed: true,
    manifest,
    watermarkId,
  };
}
