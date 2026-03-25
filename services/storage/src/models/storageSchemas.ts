import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const StorageTier = z.enum(['free', 'creator', 'pro', 'studio', 'enterprise']);
export type StorageTier = z.infer<typeof StorageTier>;

export const AssetType = z.enum([
  'image',
  'video',
  'audio',
  'model_3d',
  'document',
  'animation',
  'other',
]);
export type AssetType = z.infer<typeof AssetType>;

export const StorageClass = z.enum(['hot', 'warm', 'cold', 'glacier']);
export type StorageClass = z.infer<typeof StorageClass>;

export const AssetStatus = z.enum([
  'active',
  'archived',
  'restoring',
  'expired',
  'orphaned',
  'deleted',
]);
export type AssetStatus = z.infer<typeof AssetStatus>;

// ── Core Schemas ───────────────────────────────────────────────────────────

export const StorageAssetSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  filename: z.string().min(1),
  assetType: AssetType,
  sizeBytes: z.number().int().nonnegative(),
  storageClass: StorageClass.default('hot'),
  status: AssetStatus.default('active'),
  linkedEntityId: z.string().uuid().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().default(null),
  archivedAt: z.string().datetime().nullable().default(null),
  restoreRequestedAt: z.string().datetime().nullable().default(null),
});
export type StorageAsset = z.infer<typeof StorageAssetSchema>;

export const RetentionPolicySchema = z.object({
  projectId: z.string().uuid(),
  retentionDays: z.number().int().min(1).max(3650).default(365),
  autoArchiveDays: z.number().int().min(1).max(365).default(90),
  autoDeleteExpired: z.boolean().default(false),
  excludeTypes: z.array(AssetType).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const UserQuotaSchema = z.object({
  userId: z.string().uuid(),
  tier: StorageTier,
  usedBytes: z.number().int().nonnegative(),
  quotaBytes: z.number().int().nonnegative(),
});
export type UserQuota = z.infer<typeof UserQuotaSchema>;

// ── Request Schemas ────────────────────────────────────────────────────────

export const SetRetentionPolicyRequestSchema = z.object({
  retentionDays: z.number().int().min(1).max(3650).optional(),
  autoArchiveDays: z.number().int().min(1).max(365).optional(),
  autoDeleteExpired: z.boolean().optional(),
  excludeTypes: z.array(AssetType).optional(),
});
export type SetRetentionPolicyRequest = z.infer<typeof SetRetentionPolicyRequestSchema>;

export const CleanupRequestSchema = z.object({
  dryRun: z.boolean().default(false),
});
export type CleanupRequest = z.infer<typeof CleanupRequestSchema>;

// ── Response Schemas ───────────────────────────────────────────────────────

export const UsageByTypeSchema = z.record(AssetType, z.number().int().nonnegative());
export type UsageByType = z.infer<typeof UsageByTypeSchema>;

export const StorageUsageResponseSchema = z.object({
  projectId: z.string().uuid(),
  totalBytes: z.number().int().nonnegative(),
  byType: UsageByTypeSchema,
  assetCount: z.number().int().nonnegative(),
});
export type StorageUsageResponse = z.infer<typeof StorageUsageResponseSchema>;

export const DefaultPoliciesSchema = z.object({
  retentionDays: z.number(),
  autoArchiveDays: z.number(),
  autoDeleteExpired: z.boolean(),
  tierQuotas: z.record(StorageTier, z.string()),
});
export type DefaultPolicies = z.infer<typeof DefaultPoliciesSchema>;
