// ── Client Configuration ──

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

// ── Pagination ──

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Projects ──

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'draft';
  worldBible?: WorldBible;
  brandKit?: BrandKit;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'draft';
}

export interface WorldBible {
  setting?: string;
  tone?: string;
  rules?: string[];
  characters?: string[];
  lore?: string;
}

export interface BrandKit {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  styleGuide?: string;
}

export interface ListProjectsParams extends PaginationParams {
  status?: 'active' | 'archived' | 'draft';
}

// ── Shots ──

export interface Shot {
  id: string;
  projectId: string;
  sceneId: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'approved' | 'locked';
  duration?: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShotData {
  name: string;
  description?: string;
  duration?: number;
}

export interface UpdateShotData {
  name?: string;
  description?: string;
  duration?: number;
}

// ── Characters ──

export interface Character {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  traits?: string[];
  voiceProfile?: string;
  twinModelUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterData {
  name: string;
  projectId?: string;
  description?: string;
  traits?: string[];
  voiceProfile?: string;
}

export interface UpdateCharacterData {
  name?: string;
  description?: string;
  traits?: string[];
  voiceProfile?: string;
}

export interface ListCharactersParams extends PaginationParams {
  projectId?: string;
}

// ── Generation ──

export interface GenerationResult {
  jobId: string;
  estimatedSeconds: number;
}

export interface VideoGenerationParams {
  projectId: string;
  shotId?: string;
  prompt: string;
  duration?: number;
  resolution?: '720p' | '1080p' | '4k';
  style?: string;
}

export interface AudioGenerationParams {
  projectId: string;
  prompt?: string;
  script?: string;
  voiceId?: string;
  duration?: number;
}

export interface AvatarGenerationParams {
  characterId: string;
  script: string;
  voiceId?: string;
  emotion?: string;
}

export interface StyleCloneParams {
  sourceImageUrl: string;
  targetPrompt: string;
  strength?: number;
}

export interface ImgToCartoonParams {
  imageUrl: string;
  style?: 'anime' | 'pixar' | 'comic' | 'watercolor';
}

export interface ScriptGenerationParams {
  projectId: string;
  prompt: string;
  genre?: string;
  length?: 'short' | 'medium' | 'long';
  characters?: string[];
}

// ── Jobs ──

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress?: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ListJobsParams extends PaginationParams {
  status?: JobStatus;
  type?: string;
}

// ── Assets ──

export interface Asset {
  id: string;
  projectId?: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'model' | 'document';
  url: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ListAssetsParams extends PaginationParams {
  projectId?: string;
  type?: 'image' | 'video' | 'audio' | 'model' | 'document';
}

export interface SearchAssetsParams extends PaginationParams {
  query: string;
  projectId?: string;
  type?: 'image' | 'video' | 'audio' | 'model' | 'document';
}

export interface UploadAssetData {
  name: string;
  projectId?: string;
  file: Blob | ArrayBuffer | Uint8Array;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

// ── HTTP ──

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}
