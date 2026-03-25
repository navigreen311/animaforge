/* ---------- Governance Service HTTP Client ---------- */

const MODERATION_BASE = "http://localhost:3005";
const C2PA_BASE = "http://localhost:3006";
const WATERMARK_BASE = "http://localhost:3007";
const CONSENT_BASE = "http://localhost:3008";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/* ---------- Types ---------- */

export interface ModerationResult {
  allowed: boolean;
  categories: string[];
  confidence: number;
  jobId: string;
}

export interface PreCheckResult {
  safe: boolean;
  blockedCategories: string[];
}

export interface ConsentValidationResult {
  valid: boolean;
  missingConsents: string[];
}

export interface C2PASignResult {
  manifestId: string;
  signature: string;
  signedAt: string;
}

export interface C2PASignParams {
  jobId: string;
  outputUrl: string;
  metadata: Record<string, unknown>;
}

export interface WatermarkResult {
  watermarkId: string;
  embeddedAt: string;
}

/* ---------- Retry helper ---------- */

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(
    `Failed after ${retries} attempts: ${lastError?.message ?? "unknown error"}`,
  );
}

/* ---------- JSON POST helper ---------- */

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as T;
}

/* ---------- Public API ---------- */

/**
 * Call the content moderation service to scan generated content.
 */
export async function moderateContent(
  jobId: string,
  contentUrl: string,
  contentType: string,
): Promise<ModerationResult> {
  return postJSON<ModerationResult>(
    `${MODERATION_BASE}/governance/moderate`,
    { jobId, contentUrl, contentType },
  );
}

/**
 * Pre-check safety of a prompt and scene graph BEFORE generation starts.
 */
export async function preCheckSafety(
  prompt: string,
  sceneGraph: Record<string, unknown>,
): Promise<PreCheckResult> {
  return postJSON<PreCheckResult>(
    `${MODERATION_BASE}/governance/moderate/pre-check`,
    { prompt, sceneGraph },
  );
}

/**
 * Validate that all required consents are present for referenced characters.
 */
export async function validateConsent(
  characterRefs: string[],
  consentTypes: string[],
): Promise<ConsentValidationResult> {
  return postJSON<ConsentValidationResult>(
    `${CONSENT_BASE}/governance/consent/validate`,
    { characterRefs, consentTypes },
  );
}

/**
 * Create a C2PA manifest and sign the output content.
 */
export async function signC2PA(
  params: C2PASignParams,
): Promise<C2PASignResult> {
  return postJSON<C2PASignResult>(
    `${C2PA_BASE}/governance/c2pa/sign`,
    params,
  );
}

/**
 * Embed a durable watermark into the output content.
 */
export async function embedWatermark(
  jobId: string,
  outputUrl: string,
  data: Record<string, unknown>,
): Promise<WatermarkResult> {
  return postJSON<WatermarkResult>(
    `${WATERMARK_BASE}/governance/watermark/embed`,
    { jobId, outputUrl, data },
  );
}
