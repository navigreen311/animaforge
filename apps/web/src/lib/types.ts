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
  totalShots: number;
  approvedShots: number;
  durationSeconds?: number;
  teamMembers: TeamMember[];
  creditsCost: number;
  updatedAt: string;
  createdAt: string;
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
