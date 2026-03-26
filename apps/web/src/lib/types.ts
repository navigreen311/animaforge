export type ProjectStatus = 'draft' | 'generating' | 'review' | 'complete';
export type ProjectType = 'cartoon' | 'animation' | 'live-action' | 'mixed' | 'documentary';
export type JobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'recent' | 'name' | 'progress' | 'shots';

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  projectType: ProjectType;
  thumbnailUrl?: string;
  thumbnailGradient?: string;
  previewVideoUrl?: string;
  totalShots: number;
  approvedShots: number;
  durationSeconds?: number;
  teamMembers: TeamMember[];
  creditsCost: number;
  isPinned?: boolean;
  folderId?: string;
  updatedAt: string;
  createdAt: string;
}

export type CharacterStatus = 'draft' | 'processing' | 'active' | 'failed';
export type StyleMode = 'realistic' | 'anime' | 'cartoon' | 'cel-shaded' | 'pixel' | 'clay';
export type RightsScope = 'personal' | 'commercial' | 'expired';

export interface Character {
  id: string;
  name: string;
  description?: string;
  styleMode: StyleMode;
  status: CharacterStatus;
  isDigitalTwin: boolean;
  sourcePhotos: string[];
  voiceId?: string;
  voiceName?: string;
  projectIds: string[];
  driftScore?: number;
  rightsScope?: RightsScope;
  avatarColor: string;
  shotCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterStats {
  total: number;
  activeInProjects: number;
  digitalTwins: number;
  voicesPaired: number;
}

export type MarkerType = 'note' | 'issue' | 'approved' | 'question';

export interface TimelineMarker {
  id: string;
  projectId: string;
  userId: string;
  userInitials: string;
  timecodeMs: number;
  type: MarkerType;
  text: string;
  isResolved: boolean;
  createdAt: string;
}

export interface ShotTake {
  id: string;
  shotId: string;
  tier: 'preview' | 'standard' | 'final';
  outputUrl?: string;
  thumbnailUrl?: string;
  qualityScores?: { temporal: number; drift: string; lipSync: string };
  isActive: boolean;
  createdAt: string;
}

export interface SceneGraph {
  prompt: string;
  characterIds: string[];
  cameraType: string;
  motionStyle: string;
  emotionalBeat: string;
  styleRef?: string;
}

export interface SceneBlock {
  id: string;
  sceneNumber: number;
  heading: string;
  action: string;
  dialogue?: DialogueLine[];
  isEditing?: boolean;
}

export interface DialogueLine {
  characterName: string;
  parenthetical?: string;
  line: string;
}

export interface ShotBreakdown {
  id: string;
  shotNumber: number;
  cameraType: string;
  description: string;
  durationSeconds: number;
  characterIds?: string[];
  sceneId: string;
  sceneGraph?: Partial<SceneGraph>;
}

export interface DetectedCharacter {
  name: string;
  characterId?: string;
  occurrences: number;
}

export interface Script {
  id: string;
  title: string;
  prompt: string;
  format: string;
  tone: string;
  targetDuration: number;
  targetShotCount: number;
  content: SceneBlock[];
  shotBreakdown: ShotBreakdown[];
  detectedChars: DetectedCharacter[];
  projectId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StyleFingerprint {
  colorPalette: string[];
  contrastProfile: { level: 'low' | 'medium' | 'high'; value: number };
  grainNoise: { intensity: number; type: 'film' | 'digital' | 'none' };
  colorGrade: string;
  cameraMotion: { type: string; intensity: 'low' | 'medium' | 'high' };
  editingRhythm: { avgCutLength: number; style: 'fast' | 'moderate' | 'slow' };
  lensCharacter: { focalLength: number; aberration: 'low' | 'medium' | 'high' };
  confidence: number;
}

export interface CartoonProSettings {
  lineThickness: number;
  lineCleanup: 'off' | 'subtle' | 'strong';
  lineColor: string;
  shadingMode: 'cel-hard' | 'cel-soft' | 'painterly' | 'flat' | 'none';
  shadowIntensity: number;
  lightDirection: number;
  squashStretch: number;
  smearFrames: boolean;
  smearIntensity?: number;
  poseExaggeration: number;
  anticipation: number;
  animationStyle: '24fps' | '12fps' | '8fps' | 'custom';
  holdFrames: number;
  inbetweenQuality: 'auto' | 'draft' | 'final';
  visemeStyle: 'anime' | 'western' | 'disney' | 'realistic' | 'simple';
  comicPanelMode: boolean;
  panelLayout?: '2panel' | '3panel' | '4panel';
  onionSkin: boolean;
  onionSkinFrames?: number;
}

export interface Avatar {
  id: string;
  name: string;
  status: 'draft' | 'processing' | 'complete' | 'failed';
  pipelineStep: string;
  styleMode: string;
  sourcePhotos: string[];
  voiceId?: string;
  qualityScore?: number;
  polyCount?: number;
  textureRes?: string;
  rigType?: string;
  blendShapes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudioTrack {
  id: string;
  type: 'music' | 'voice' | 'sfx';
  name: string;
  audioUrl?: string;
  duration?: number;
  waveformData?: number[];
  genre?: string;
  mood?: string;
  bpm?: number;
  style?: string;
  language?: string;
  characterId?: string;
  beatMap?: { timecodeMs: number; type: 'hit' | 'beat' | 'downbeat' }[];
  isFavorite: boolean;
  createdAt: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  color: string;
  projectCount: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  projectTitle: string;
  shotNumber: number;
  status: JobStatus;
  progress: number;
  estimatedSecondsRemaining?: number;
  tier: 'preview' | 'standard' | 'final';
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'approval' | 'generation' | 'share' | 'marketplace' | 'comment' | 'export';
  projectId?: string;
  projectTitle?: string;
  description: string;
  userId: string;
  userInitials: string;
  dotColor: string;
  timestamp: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalShots: number;
  approvedShots: number;
  creditsUsed: number;
  creditsTotal: number;
  activeRenderJobs: number;
}
