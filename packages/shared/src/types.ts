// AnimaForge Shared Types
// Used across all services

export type UUID = string;
export type ISO8601 = string;

// User roles
export type UserRole = 'creator' | 'editor' | 'admin' | 'enterprise';
export type UserTier = 'free' | 'creator' | 'pro' | 'studio' | 'enterprise';

// Project
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type ProjectPhase = 'pre_production' | 'production' | 'post_production' | 'delivered';

// Shot
export type ShotStatus = 'draft' | 'generating' | 'review' | 'approved' | 'locked';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';

// Generation
export type JobType = 'video' | 'audio' | 'avatar' | 'style_clone' | 'img_to_cartoon' | 'qc' | 'script' | 'music';
export type JobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
export type RenderTier = 'preview' | 'standard' | 'final' | 'batch';

// Character
export type StyleMode = 'realistic' | 'anime' | 'cartoon' | 'cel' | 'pixel';
export type RightsStatus = 'personal' | 'commercial' | 'expired';

// Governance
export type ModerationResult = 'pass' | 'flag' | 'block';
export type GovernanceStage = 'moderation' | 'consent' | 'c2pa' | 'watermark';

// WebSocket Events
export interface WSJobProgress {
  event: 'job:progress';
  data: { job_id: UUID; progress: number; stage: string };
}

export interface WSJobComplete {
  event: 'job:complete';
  data: { job_id: UUID; output_url: string; quality_scores: Record<string, number>; c2pa_manifest: string };
}

export interface WSJobFailed {
  event: 'job:failed';
  data: { job_id: UUID; error: string; reason_code: string };
}

export interface WSCollabCursor {
  event: 'collab:cursor';
  data: { user_id: UUID; shot_id: UUID; position: { x: number; y: number } };
}

export interface WSCollabEdit {
  event: 'collab:edit';
  data: { user_id: UUID; shot_id: UUID; delta: unknown };
}

export type WSEvent = WSJobProgress | WSJobComplete | WSJobFailed | WSCollabCursor | WSCollabEdit;

// Scene Graph (E3)
export interface SceneGraph {
  subject: string;
  camera: {
    angle: string;
    movement: string;
    focal_length?: number;
  };
  action: string;
  emotion: string;
  timing: {
    duration_ms: number;
    pacing: string;
  };
  dialogue?: string;
  sfx?: string[];
  style_ref?: UUID;
  character_refs?: UUID[];
}

// Style Fingerprint (X6)
export interface StyleFingerprint {
  color_palette: { dominant: string[]; accent: string[]; temperature: number };
  contrast_profile: { shadows: number; highlights: number; gamma: number };
  grain_noise: { intensity: number; frequency: number; type: string };
  saturation_curve: number[];
  lens_character: { focal_length: number; aberration: number; vignette: number };
  depth_of_field: { bokeh_radius: number; focus_style: string };
  camera_motion: { handheld_intensity: number; primary_moves: string[] };
  line_weight?: { min: number; max: number; taper: boolean };
  fill_style?: string;
  shading_approach?: string;
  source_url: string;
  source_type: 'video' | 'animation';
  confidence: number;
  created_at: ISO8601;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Credit costs
export const CREDIT_COSTS = {
  'video_10s_preview': 1,
  'video_10s_final': 5,
  'video_30s_preview': 2,
  'video_30s_final': 12,
  'avatar_reconstruction': 10,
  'avatar_animation_10s_preview': 3,
  'avatar_animation_10s_final': 10,
  'style_clone': 2,
  'img_to_cartoon': 0.5,
  'script_generation': 1,
  'music_30s': 2,
  'audio_voice_30s': 1,
  'auto_qc': 0.5,
} as const;
