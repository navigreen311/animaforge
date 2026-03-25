import {
  preCheckSafety,
  validateConsent,
} from "../utils/governanceClient.js";

/* ---------- Types ---------- */

export interface PreCheckResult {
  allowed: boolean;
  blockedCategories?: string[];
  missingConsents?: string[];
}

/* ---------- Pre-generation safety check ---------- */

/**
 * Run safety and consent checks BEFORE generation starts.
 * Returns whether generation is allowed to proceed.
 */
export async function runPreCheck(
  prompt: string,
  sceneGraph: Record<string, unknown>,
  characterRefs: string[],
): Promise<PreCheckResult> {
  // Run safety pre-check and consent validation in parallel
  const [safetyResult, consentResult] = await Promise.all([
    preCheckSafety(prompt, sceneGraph),
    validateConsent(characterRefs, ["likeness", "voice", "motion"]),
  ]);

  const blockedCategories = safetyResult.safe
    ? undefined
    : safetyResult.blockedCategories;
  const missingConsents = consentResult.valid
    ? undefined
    : consentResult.missingConsents;

  const allowed = safetyResult.safe && consentResult.valid;

  return {
    allowed,
    ...(blockedCategories && { blockedCategories }),
    ...(missingConsents && { missingConsents }),
  };
}
