import { Job } from 'bullmq';
import {
  moderateContent,
  validateConsent,
  signC2PA,
  embedWatermark,
} from '../utils/governanceClient.js';

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

/**
 * Raised when signing or watermarking is reached without moderation and consent
 * having passed first.
 *
 * The pipeline below already runs in the right order, and that was the entire
 * guarantee: a reordering during a refactor would have produced a signed
 * non-compliant artefact with no test failing and no error logged. A signature
 * asserts provenance, so signing first and checking afterwards does not merely
 * check late — it attaches an authenticity claim to content that may never have
 * been permitted to exist.
 *
 * The assertion below makes the ordering a precondition rather than a
 * convention. It cannot trigger in the current code, which is the point: it is
 * there for the version of this file nobody has written yet.
 */
export class GovernanceOrderError extends Error {
  constructor(stage: string, missing: string[]) {
    super(
      `${stage} was reached before ${missing.join(' and ')} passed. ` +
        'Nothing is signed or watermarked until compliance moderation and consent ' +
        'validation have both returned a pass — a signed artefact carries an ' +
        'attestation of provenance, and attaching one to unreviewed content is ' +
        'worse than leaving it unsigned.',
    );
    this.name = 'GovernanceOrderError';
  }
}

/** Gates admitted so far in one pipeline run. */
interface GatesPassed {
  moderation: boolean;
  consent: boolean;
}

function assertSignable(stage: string, gates: GatesPassed): void {
  const missing = [
    !gates.moderation && 'content moderation',
    !gates.consent && 'consent validation',
  ].filter(Boolean) as string[];

  if (missing.length > 0) throw new GovernanceOrderError(stage, missing);
}

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
  const gates: GatesPassed = { moderation: false, consent: false };

  // ── Stage 1: Content Moderation ──
  emit('content_moderation', 'running');
  const moderationResult = await moderateContent(job.jobId, job.outputUrl, job.contentType);
  if (!moderationResult.allowed) {
    emit('content_moderation', 'blocked');
    return {
      passed: false,
      blockedReason: `Content blocked: ${moderationResult.categories.join(', ')}`,
    };
  }
  gates.moderation = true;
  emit('content_moderation', 'passed');

  // ── Stage 2: Consent Validation ──
  emit('consent_validation', 'running');
  const consentResult = await validateConsent(job.characterRefs, job.consentTypes);
  if (!consentResult.valid) {
    emit('consent_validation', 'blocked');
    return {
      passed: false,
      blockedReason: `Missing consents: ${consentResult.missingConsents.join(', ')}`,
    };
  }
  gates.consent = true;
  emit('consent_validation', 'passed');

  // ── Stage 3: C2PA Signing ──
  assertSignable('C2PA signing', gates);
  emit('c2pa_signing', 'running');
  let manifest: GovernancePipelineResult['manifest'];
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
        emit('c2pa_signing', 'alert');
        return {
          passed: false,
          blockedReason: `C2PA signing failed after ${C2PA_MAX_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }
  emit('c2pa_signing', 'passed');

  // ── Stage 4: Durable Watermarking ──
  // Watermarking is asserted too. It is durable by design, so an unreviewed
  // frame carrying one is the hardest of these four to walk back.
  assertSignable('Watermarking', gates);
  emit('watermarking', 'running');
  let watermarkId: string | undefined;
  try {
    const watermarkResult = await embedWatermark(job.jobId, job.outputUrl, job.metadata);
    watermarkId = watermarkResult.watermarkId;
    emit('watermarking', 'passed');
  } catch {
    emit('watermarking', 'manual_review');
    // Watermark failure does not block — flagged for manual review
  }

  return {
    passed: true,
    manifest,
    watermarkId,
  };
}
