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
