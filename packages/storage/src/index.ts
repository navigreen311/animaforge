export { s3Client } from "./s3Client.js";

export {
  uploadFile,
  downloadFile,
  getSignedUrl,
  deleteFile,
  listFiles,
  fileExists,
  getFileMetadata,
  type UploadResult,
  type ListFilesResult,
  type FileMetadata,
} from "./storageService.js";

export {
  generateAssetKey,
  generateAvatarKey,
  generateExportKey,
  generateThumbnailKey,
  getAllowedMimeTypes,
  validateFileSize,
  type UploadCategory,
} from "./uploadHelpers.js";

export {
  getLifecyclePolicy,
  STORAGE_TIERS,
  type StorageTier,
  type TierName,
  type LifecycleRule,
} from "./lifecycleRules.js";
