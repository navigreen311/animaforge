export { AnimaForgeClient } from './client';
export { HttpClient } from './http';

// Errors
export {
  AnimaForgeError,
  AuthenticationError,
  RateLimitError,
  InsufficientCreditsError,
  NotFoundError,
} from './errors';

// Resources
export { ProjectsResource } from './resources/projects';
export { ShotsResource } from './resources/shots';
export { CharactersResource } from './resources/characters';
export { GenerationResource } from './resources/generation';
export { JobsResource } from './resources/jobs';
export { AssetsResource } from './resources/assets';
export { WebhooksResource } from './resources/webhooks';
export { DeveloperResource } from './resources/developer';

// Webhook & Developer types
export type { Webhook, WebhookLogEntry } from './resources/webhooks';
export type { ApiUsage, RateLimitStatus, ChangelogEntry, SandboxCredentials } from './resources/developer';

// Types
export type {
  ClientConfig,
  PaginationParams,
  PaginatedResponse,
  Project,
  CreateProjectData,
  UpdateProjectData,
  ListProjectsParams,
  WorldBible,
  BrandKit,
  Shot,
  CreateShotData,
  UpdateShotData,
  Character,
  CreateCharacterData,
  UpdateCharacterData,
  ListCharactersParams,
  GenerationResult,
  VideoGenerationParams,
  AudioGenerationParams,
  AvatarGenerationParams,
  StyleCloneParams,
  ImgToCartoonParams,
  ScriptGenerationParams,
  Job,
  JobStatus,
  ListJobsParams,
  Asset,
  ListAssetsParams,
  SearchAssetsParams,
  UploadAssetData,
  RequestOptions,
  ApiResponse,
} from './types';
