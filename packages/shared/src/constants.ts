// AnimaForge Constants

export const APP_NAME = 'AnimaForge';
export const APP_VERSION = '0.1.0';
export const API_VERSION = 'v1';

// API Paths
export const API_BASE = `/api/${API_VERSION}`;
export const AI_API_BASE = `/ai/${API_VERSION}`;

// Generation Pipeline Stages (11-stage)
export const PIPELINE_STAGES = [
  'intent_parsing',
  'safety_precheck',
  'rights_validation',
  'conditioning_build',
  'model_routing',
  'core_generation',
  'audio_generation',
  'post_processing',
  'qc_validation',
  'governance',
  'export_logging',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

// Governance Pipeline Stages (4-stage)
export const GOVERNANCE_STAGES = [
  'content_moderation',
  'consent_validation',
  'c2pa_signing',
  'durable_watermarking',
] as const;

// Render Tiers
export const RENDER_TIERS = {
  preview: { resolution: '512px', duration_limit: '30s', latency: '5-15s' },
  standard: { resolution: '1080p', duration_limit: '2min', latency: '30-90s' },
  final: { resolution: '4K', duration_limit: '10min', latency: '2-8min' },
  batch: { resolution: '1080p', duration_limit: 'per job', latency: 'overnight' },
} as const;

// SLOs
export const SLO_TARGETS = {
  platform_api: { availability: '99.95%', p95: '200ms', p99: '500ms' },
  ai_inference: { availability: '99.9%', p95: '500ms', p99: '1s' },
  preview_gen: { availability: '99.5%', p95: '15s', p99: '30s' },
  governance: { availability: '99.99%', p95: '500ms', p99: '1s' },
  websocket: { availability: '99.9%', p95: '100ms', p99: '250ms' },
  cdn: { availability: '99.99%', p95: '50ms', p99: '100ms' },
  db_read: { availability: '99.99%', p95: '10ms', p99: '50ms' },
} as const;

// Avatar Export Formats (X5)
export const AVATAR_EXPORT_FORMATS = [
  'gltf2',
  'arkit_blendshapes',
  'usd',
  'bvh_motion',
  'fbx',
  'mp4_rendered',
] as const;

// Pricing tiers
export const PRICING_TIERS = {
  free: { price: 0, credits: 50, projects: 5 },
  creator: { price: 29, credits: 500, projects: 25 },
  pro: { price: 49, credits: 1000, projects: -1 },
  studio: { price: 99, credits: 2000, projects: -1 },
  enterprise: { price: -1, credits: -1, projects: -1 },
} as const;
