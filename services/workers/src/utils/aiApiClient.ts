/* ---------- AI API HTTP Client ---------- */

const AI_API_BASE =
  process.env.AI_API_BASE_URL ?? "http://localhost:8001/ai/v1";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

/* ---------- Types ---------- */

export interface VideoGenerationParams {
  projectId: string;
  userId: string;
  prompt: string;
  sceneGraph?: Record<string, unknown>;
  style?: string;
  duration?: number;
  resolution?: string;
  [key: string]: unknown;
}

export interface AudioGenerationParams {
  projectId: string;
  userId: string;
  prompt: string;
  type?: "voice" | "sfx" | "music";
  duration?: number;
  [key: string]: unknown;
}

export interface AvatarReconstructionParams {
  projectId: string;
  userId: string;
  referenceImages: string[];
  style?: string;
  [key: string]: unknown;
}

export interface StyleCloneParams {
  projectId: string;
  userId: string;
  sourceUrl: string;
  targetUrl: string;
  strength?: number;
  [key: string]: unknown;
}

export interface CartoonConversionParams {
  projectId: string;
  userId: string;
  imageUrl: string;
  style?: string;
  [key: string]: unknown;
}

export interface AiJobSubmissionResult {
  jobId: string;
  status: string;
  estimatedDuration?: number;
}

export interface AiJobStatusResult {
  jobId: string;
  status: "queued" | "running" | "complete" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/* ---------- Fetch with timeout + retry ---------- */

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          "AI API HTTP " + response.status + ": " + response.statusText + " -- " + body,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        throw new Error("AI API request timed out after " + TIMEOUT_MS + "ms");
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(
    "AI API failed after " + retries + " attempts: " + (lastError?.message ?? "unknown"),
  );
}

/* ---------- JSON helpers ---------- */

function postJSON<T>(endpoint: string, body: unknown): Promise<T> {
  return fetchWithRetry<T>(AI_API_BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getJSON<T>(endpoint: string): Promise<T> {
  return fetchWithRetry<T>(AI_API_BASE + endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

/* ---------- Public API ---------- */

export function submitVideoGeneration(
  params: VideoGenerationParams,
): Promise<AiJobSubmissionResult> {
  return postJSON<AiJobSubmissionResult>("/generate/video", params);
}

export function submitAudioGeneration(
  params: AudioGenerationParams,
): Promise<AiJobSubmissionResult> {
  return postJSON<AiJobSubmissionResult>("/generate/audio", params);
}

export function submitAvatarReconstruction(
  params: AvatarReconstructionParams,
): Promise<AiJobSubmissionResult> {
  return postJSON<AiJobSubmissionResult>("/generate/avatar", params);
}

export function submitStyleClone(
  params: StyleCloneParams,
): Promise<AiJobSubmissionResult> {
  return postJSON<AiJobSubmissionResult>("/style/clone", params);
}

export function submitCartoonConversion(
  params: CartoonConversionParams,
): Promise<AiJobSubmissionResult> {
  return postJSON<AiJobSubmissionResult>("/convert/img-to-cartoon", params);
}

export function getJobStatus(jobId: string): Promise<AiJobStatusResult> {
  return getJSON<AiJobStatusResult>("/jobs/" + jobId);
}
