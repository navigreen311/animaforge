/**
 * Helpers for generating standardised S3 keys and validating uploads.
 */

import path from "node:path";

// ---------------------------------------------------------------------------
// Key generators
// ---------------------------------------------------------------------------

/**
 * Generate a unique asset key scoped to a project.
 * Pattern: projects/{projectId}/{type}/{timestamp}-{filename}
 */
export function generateAssetKey(
  projectId: string,
  type: string,
  filename: string,
): string {
  const timestamp = Date.now();
  return `projects/${projectId}/${type}/${timestamp}-${filename}`;
}

/**
 * Generate a key for a character avatar image.
 * Pattern: avatars/{characterId}/{filename}
 */
export function generateAvatarKey(
  characterId: string,
  filename: string,
): string {
  return `avatars/${characterId}/${filename}`;
}

/**
 * Generate a key for an export output file.
 * Pattern: exports/{projectId}/{jobId}/output.{format}
 */
export function generateExportKey(
  projectId: string,
  jobId: string,
  format: string,
): string {
  return `exports/${projectId}/${jobId}/output.${format}`;
}

/**
 * Derive a thumbnail key from an existing asset key by replacing its
 * extension with `-thumb.webp`.
 */
export function generateThumbnailKey(assetKey: string): string {
  const ext = path.extname(assetKey);
  return assetKey.replace(ext, "-thumb.webp");
}

// ---------------------------------------------------------------------------
// MIME type allowlists
// ---------------------------------------------------------------------------

export type UploadCategory = "video" | "image" | "audio" | "model";

const ALLOWED_MIME_TYPES: Record<UploadCategory, string[]> = {
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ],
  image: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
  ],
  model: [
    "model/gltf-binary",
    "model/gltf+json",
    "application/octet-stream",
    "model/obj",
    "model/fbx",
  ],
};

/**
 * Return the map of allowed MIME types for every upload category.
 */
export function getAllowedMimeTypes(): Record<UploadCategory, string[]> {
  return { ...ALLOWED_MIME_TYPES };
}

// ---------------------------------------------------------------------------
// File-size validation
// ---------------------------------------------------------------------------

/** Maximum bytes per upload category. */
const SIZE_LIMITS: Record<UploadCategory, number> = {
  video: 500 * 1024 * 1024,   // 500 MB
  image: 50 * 1024 * 1024,    // 50 MB
  audio: 100 * 1024 * 1024,   // 100 MB
  model: 1024 * 1024 * 1024,  // 1 GB
};

/**
 * Validate that a file's size does not exceed the limit for its category.
 * Returns `true` when the size is within the allowed limit.
 */
export function validateFileSize(
  size: number,
  category: UploadCategory,
): boolean {
  const limit = SIZE_LIMITS[category];
  if (limit === undefined) {
    return false;
  }
  return size <= limit;
}
