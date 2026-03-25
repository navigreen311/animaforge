/* ------------------------------------------------------------------ */
/*  AnimaForge — Core Domain Types                                     */
/* ------------------------------------------------------------------ */

/** Generation quality tier affecting cost and output fidelity. */
export type GenerationTier = 'draft' | 'standard' | 'premium';

/** Lifecycle status of a shot within the pipeline. */
export type ShotStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'generating';

/** Pipeline stage labels surfaced in the UI during generation. */
export type GenerationStage =
  | 'queued'
  | 'preprocessing'
  | 'generating'
  | 'post-processing'
  | 'finalizing'
  | 'complete'
  | 'failed';

/** Overall status of a generation job. */
export type JobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';

/* ------------------------------------------------------------------ */
/*  Users & Collaboration                                              */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'editor' | 'viewer';
}

/* ------------------------------------------------------------------ */
/*  Project                                                            */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: User[];
  worldBible: WorldBible;
  brandKit: BrandKit;
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}

export interface WorldBible {
  setting: string;
  era: string;
  rules: string[];
  loreNotes: string;
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl?: string;
  guidelines: string;
}

/* ------------------------------------------------------------------ */
/*  Scene / Shot / SceneGraph                                          */
/* ------------------------------------------------------------------ */

export interface Scene {
  id: string;
  projectId: string;
  name: string;
  order: number;
  shots: Shot[];
  audioTracks: AudioTrack[];
}

export interface Shot {
  id: string;
  sceneId: string;
  number: number;
  subject: string;
  camera: string;
  action: string;
  emotion: string;
  timing: string;
  dialogue: string;
  durationSec: number;
  status: ShotStatus;
  characterRefs: string[];
  styleRef: string;
  thumbnailUrl?: string;
  outputUrl?: string;
}

export interface SceneGraph {
  nodes: SceneGraphNode[];
  edges: SceneGraphEdge[];
}

export interface SceneGraphNode {
  id: string;
  type: 'character' | 'prop' | 'environment' | 'effect';
  label: string;
  position: { x: number; y: number; z: number };
  metadata: Record<string, unknown>;
}

export interface SceneGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

/* ------------------------------------------------------------------ */
/*  Characters                                                         */
/* ------------------------------------------------------------------ */

export type StyleMode = 'realistic' | 'anime' | 'cartoon' | 'cel' | 'pixel';

export type ExportFormat = 'glTF' | 'ARKit' | 'USD' | 'FBX';

export interface BodyParams {
  height?: string;
  build?: string;
}

export interface HairParams {
  style?: string;
  color?: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  styleMode: StyleMode;
  isDigitalTwin: boolean;
  referenceImages: string[];
  voiceProfileId?: string;
  bodyParams?: BodyParams;
  hairParams?: HairParams;
  wardrobeDescription?: string;
  twinPhotos?: string[];
  twinReconstructionStatus?: 'idle' | 'processing' | 'complete' | 'failed';
  avatarUrl?: string;
  traits: string[];
  embeddings?: number[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Style                                                              */
/* ------------------------------------------------------------------ */

export interface StyleFingerprint {
  id: string;
  name: string;
  baseModel: string;
  loraWeights?: string;
  samplerSettings: Record<string, unknown>;
  referenceImages: string[];
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Audio                                                              */
/* ------------------------------------------------------------------ */

export interface AudioTrack {
  id: string;
  sceneId: string;
  label: string;
  type: 'dialogue' | 'music' | 'sfx' | 'voiceover';
  durationSec: number;
  url?: string;
  waveform: number[];
}

/* ------------------------------------------------------------------ */
/*  Generation Jobs                                                    */
/* ------------------------------------------------------------------ */

export interface GenerationJob {
  id: string;
  shotId: string;
  tier: GenerationTier;
  status: JobStatus;
  progress: number;
  stage: GenerationStage;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Quality Report                                                     */
/* ------------------------------------------------------------------ */

export interface QualityScores {
  flicker: number;
  identityDrift: number;
  loudness: number;
  artifacts: number;
}
