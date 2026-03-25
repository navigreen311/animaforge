import { describe, it, expect } from 'vitest';
import {
  STORAGE_TIERS,
  getLifecyclePolicy,
  type TierName,
} from '../../packages/storage/src/lifecycleRules';
import {
  generateAssetKey,
  generateAvatarKey,
  generateExportKey,
  generateThumbnailKey,
  getAllowedMimeTypes,
  validateFileSize,
} from '../../packages/storage/src/uploadHelpers';

// ---------------------------------------------------------------------------
// 1. Storage tier definitions
// ---------------------------------------------------------------------------
describe('Storage - Tier Definitions', () => {
  it('defines hot, warm, and cold tiers', () => {
    expect(STORAGE_TIERS.hot.storageClass).toBe('STANDARD');
    expect(STORAGE_TIERS.warm.storageClass).toBe('STANDARD_IA');
    expect(STORAGE_TIERS.cold.storageClass).toBe('GLACIER');
    expect(STORAGE_TIERS.warm.transitionDays).toBe(30);
    expect(STORAGE_TIERS.cold.transitionDays).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// 2. Lifecycle policy - hot
// ---------------------------------------------------------------------------
describe('Storage - Lifecycle Policy (hot)', () => {
  it('returns no transitions for hot tier', () => {
    const policy = getLifecyclePolicy('hot');
    expect(policy.ID).toBe('animaforge-hot-lifecycle');
    expect(policy.Transitions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Lifecycle policy - cold
// ---------------------------------------------------------------------------
describe('Storage - Lifecycle Policy (cold)', () => {
  it('returns two transitions for cold tier (IA at 30d, GLACIER at 90d)', () => {
    const policy = getLifecyclePolicy('cold');
    expect(policy.ID).toBe('animaforge-cold-lifecycle');
    expect(policy.Transitions).toHaveLength(2);
    expect(policy.Transitions[0].Days).toBe(30);
    expect(policy.Transitions[0].StorageClass).toBe('STANDARD_IA');
    expect(policy.Transitions[1].Days).toBe(90);
    expect(policy.Transitions[1].StorageClass).toBe('GLACIER');
  });
});

// ---------------------------------------------------------------------------
// 4. Asset key generation
// ---------------------------------------------------------------------------
describe('Storage - Key Generation', () => {
  it('generates proper asset keys scoped to project', () => {
    const key = generateAssetKey('proj-1', 'image', 'photo.png');
    expect(key).toMatch(/^projects\/proj-1\/image\/\d+-photo\.png$/);
  });

  it('generates avatar keys', () => {
    const key = generateAvatarKey('char-1', 'avatar.glb');
    expect(key).toBe('avatars/char-1/avatar.glb');
  });

  it('generates export keys', () => {
    const key = generateExportKey('proj-1', 'job-1', 'mp4');
    expect(key).toBe('exports/proj-1/job-1/output.mp4');
  });

  it('generates thumbnail keys', () => {
    const key = generateThumbnailKey('projects/proj-1/image/photo.png');
    expect(key).toBe('projects/proj-1/image/photo-thumb.webp');
  });
});

// ---------------------------------------------------------------------------
// 5. MIME type validation
// ---------------------------------------------------------------------------
describe('Storage - MIME Type Validation', () => {
  it('returns allowed MIME types for all categories', () => {
    const mimeTypes = getAllowedMimeTypes();
    expect(mimeTypes.video).toContain('video/mp4');
    expect(mimeTypes.image).toContain('image/png');
    expect(mimeTypes.audio).toContain('audio/wav');
    expect(mimeTypes.model).toContain('model/gltf-binary');
  });
});

// ---------------------------------------------------------------------------
// 6. File size validation
// ---------------------------------------------------------------------------
describe('Storage - File Size Validation', () => {
  it('validates file sizes within limits', () => {
    expect(validateFileSize(10 * 1024 * 1024, 'image')).toBe(true);   // 10 MB < 50 MB
    expect(validateFileSize(60 * 1024 * 1024, 'image')).toBe(false);  // 60 MB > 50 MB
  });

  it('validates video size limit at 500 MB', () => {
    expect(validateFileSize(499 * 1024 * 1024, 'video')).toBe(true);
    expect(validateFileSize(501 * 1024 * 1024, 'video')).toBe(false);
  });

  it('validates model size limit at 1 GB', () => {
    expect(validateFileSize(999 * 1024 * 1024, 'model')).toBe(true);
    expect(validateFileSize(1025 * 1024 * 1024, 'model')).toBe(false);
  });
});
