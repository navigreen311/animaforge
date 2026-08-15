/**
 * Avatar Studio client for the X5 reconstruction pipeline.
 *
 * Talks to two services: the AI API runs the reconstruction, and the platform
 * API stores the artifacts it produced against the character record.
 *
 * Like the character tabs' client this imports nothing, so the parts that
 * decide what the user is told — whether output is real or procedural, which
 * pipeline stages actually ran — are unit-testable on their own.
 */

/* ── Wire types ─────────────────────────────────────────────────────────── */

export interface AvatarCapability {
  requested_engine: string;
  active_engine: string;
  real_engine_available: boolean;
  torch_installed: boolean;
  gsplat_installed: boolean;
  cuda_available: boolean;
  cuda_device_count: number;
  weights_present: boolean;
  missing: string[];
  notes: string;
  identity_scoring_available: boolean;
  flame_fitting_available: boolean;
  mock_notice: string | null;
}

export type StepStatus = 'completed' | 'skipped' | 'failed';

export interface PipelineStepResult {
  step: number;
  name: string;
  description: string;
  status: StepStatus;
  reason?: string;
  note?: string | null;
  duration_ms?: number;
  metrics?: Record<string, unknown>;
}

export interface StoredArtifact {
  key: string;
  url: string;
  size_bytes: number;
  sha256: string;
  backend: string;
}

export interface AvatarJob {
  job_id: string;
  engine: string;
  requested_engine: string;
  is_mock: boolean;
  mock_notice: string | null;
  model_url: string;
  rig_url: string;
  splat_url: string;
  eye_animation_url: string;
  steps_completed: PipelineStepResult[];
  steps_summary: Record<string, number>;
  artifacts: Record<string, StoredArtifact>;
  skin: Record<string, unknown>;
  body_params: Record<string, unknown>;
  eye_statistics: Record<string, unknown>;
  warnings: string[];
}

export interface GenerateAvatarRequest {
  characterId: string;
  photos: string[];
  styleMode?: string;
  skinTone?: string | null;
  eyeClipSeconds?: number;
}

/* ── Transport ──────────────────────────────────────────────────────────── */

export interface AvatarRequestContext {
  /** AI API origin. Defaults to `NEXT_PUBLIC_AI_API_URL`. */
  aiBaseUrl?: string;
  /** Platform API origin. Defaults to `NEXT_PUBLIC_API_URL`. */
  platformBaseUrl?: string;
  token?: string | null;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export class AvatarApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AvatarApiError';
  }
}

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

export function resolveAiBaseUrl(context: AvatarRequestContext = {}): string {
  const configured = context.aiBaseUrl ?? env('NEXT_PUBLIC_AI_API_URL');
  return (configured || 'http://localhost:8001').replace(/\/+$/, '');
}

export function resolvePlatformBaseUrl(context: AvatarRequestContext = {}): string {
  const configured = context.platformBaseUrl ?? env('NEXT_PUBLIC_API_URL');
  return (configured || 'http://localhost:4000').replace(/\/+$/, '');
}

async function send<T>(
  url: string,
  method: string,
  body: unknown,
  context: AvatarRequestContext,
): Promise<T> {
  const doFetch = context.fetchImpl ?? fetch;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (context.token) headers.Authorization = `Bearer ${context.token}`;

  const response = await doFetch(url, {
    method,
    headers,
    signal: context.signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    throw new AvatarApiError(response.status, await readError(response));
  }

  const payload = (await response.json()) as { data?: T } | T;
  return (payload as { data?: T }).data ?? (payload as T);
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return (
      body?.detail ?? body?.error?.message ?? body?.message ?? `Request failed (${response.status})`
    );
  } catch {
    return `Request failed (${response.status})`;
  }
}

/* ── Calls ──────────────────────────────────────────────────────────────── */

/** Ask the AI API what it can actually do before offering to run a job. */
export function fetchCapabilities(context: AvatarRequestContext = {}): Promise<AvatarCapability> {
  return send<AvatarCapability>(
    `${resolveAiBaseUrl(context)}/ai/v1/avatar/capabilities`,
    'GET',
    undefined,
    context,
  );
}

/** Run the X5 pipeline. */
export function generateAvatar(
  request: GenerateAvatarRequest,
  context: AvatarRequestContext = {},
): Promise<AvatarJob> {
  return send<AvatarJob>(
    `${resolveAiBaseUrl(context)}/ai/v1/generate/avatar`,
    'POST',
    {
      character_id: request.characterId,
      photos: request.photos,
      style_mode: request.styleMode ?? 'realistic',
      skin_tone: request.skinTone ?? null,
      eye_clip_seconds: request.eyeClipSeconds ?? 10,
    },
    context,
  );
}

/**
 * Store a finished job's artifacts on the character record.
 *
 * `isDigitalTwin` is only set when the reconstruction was real. A procedural
 * result is a placeholder, and flagging it as a digital twin would make the
 * character claim a provenance it does not have.
 */
export function persistAvatarArtifacts(
  characterId: string,
  job: AvatarJob,
  context: AvatarRequestContext = {},
): Promise<unknown> {
  return send<unknown>(
    `${resolvePlatformBaseUrl(context)}/api/v1/characters/${encodeURIComponent(
      characterId,
    )}/avatar`,
    'PUT',
    {
      gltfUrl: job.model_url,
      facsRigUrl: job.rig_url,
      bodyParams: job.body_params,
      isDigitalTwin: !job.is_mock,
    },
    context,
  );
}

/** Run the pipeline and record its output in one step. */
export async function reconstructAndPersist(
  request: GenerateAvatarRequest,
  context: AvatarRequestContext = {},
): Promise<AvatarJob> {
  const job = await generateAvatar(request, context);
  await persistAvatarArtifacts(request.characterId, job, context);
  return job;
}

/* ── Presentation helpers ───────────────────────────────────────────────── */

/**
 * One-line summary of what a host will produce, for a banner above the
 * Start Reconstruction button.
 */
export function describeCapability(capability: AvatarCapability | null): {
  tone: 'ready' | 'mock' | 'blocked' | 'unknown';
  headline: string;
  detail: string;
} {
  if (!capability) {
    return {
      tone: 'unknown',
      headline: 'Checking reconstruction engine…',
      detail: '',
    };
  }

  if (capability.real_engine_available) {
    return {
      tone: 'ready',
      headline: 'Photogrammetric reconstruction available',
      detail: capability.notes,
    };
  }

  if (capability.requested_engine === 'real') {
    return {
      tone: 'blocked',
      headline: 'Real reconstruction requested but unavailable',
      detail: `Missing: ${capability.missing.join(', ')}. Jobs will fail rather than return placeholder output.`,
    };
  }

  return {
    tone: 'mock',
    headline: 'Preview mode — geometry is procedural',
    detail: capability.mock_notice ?? 'Reference photographs are not analysed on this host.',
  };
}

/** Stages that genuinely ran, for a progress display that does not overstate. */
export function completedStepNames(job: AvatarJob | null): string[] {
  if (!job) return [];
  return job.steps_completed.filter((step) => step.status === 'completed').map((step) => step.name);
}

/** Stages that were skipped, paired with why. */
export function skippedSteps(job: AvatarJob | null): { name: string; reason: string }[] {
  if (!job) return [];
  return job.steps_completed
    .filter((step) => step.status === 'skipped')
    .map((step) => ({ name: step.name, reason: step.reason ?? 'No reason given' }));
}

/**
 * The identity-preservation score, or null when none was computed.
 *
 * Returns null rather than a placeholder number: the Avatar Studio used to
 * display a hardcoded 87, which is precisely the kind of invented metric this
 * has to avoid.
 */
export function identityScore(job: AvatarJob | null): number | null {
  if (!job) return null;
  const validation = job.steps_completed.find((step) => step.name === 'quality_validation');
  const score = validation?.metrics?.identity_score;
  return typeof score === 'number' ? score : null;
}
