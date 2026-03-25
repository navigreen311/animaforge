import { v4 as uuidv4 } from 'uuid';
import type {
  StorageAsset,
  RetentionPolicy,
  StorageTier,
  UsageByType,
  StorageUsageResponse,
} from '../models/storageSchemas';

// ── Tier Quotas ────────────────────────────────────────────────────────────

export const TIER_QUOTAS: Record<StorageTier, string> = {
  free: '5GB',
  creator: '50GB',
  pro: '200GB',
  studio: '1TB',
  enterprise: 'unlimited',
};

const TIER_QUOTA_BYTES: Record<StorageTier, number> = {
  free: 5 * 1024 ** 3,
  creator: 50 * 1024 ** 3,
  pro: 200 * 1024 ** 3,
  studio: 1024 * 1024 ** 3,
  enterprise: Number.MAX_SAFE_INTEGER,
};

// ── In-Memory Stores ───────────────────────────────────────────────────────

export const assets: Map<string, StorageAsset> = new Map();
export const retentionPolicies: Map<string, RetentionPolicy> = new Map();
export const userTiers: Map<string, StorageTier> = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ── Service Functions ──────────────────────────────────────────────────────

/**
 * Calculate storage usage for a project, summed by asset type.
 */
export function calculateUsage(projectId: string): StorageUsageResponse {
  const byType: Record<string, number> = {};
  let totalBytes = 0;
  let assetCount = 0;

  for (const asset of assets.values()) {
    if (asset.projectId === projectId && asset.status === 'active') {
      totalBytes += asset.sizeBytes;
      byType[asset.assetType] = (byType[asset.assetType] ?? 0) + asset.sizeBytes;
      assetCount++;
    }
  }

  return {
    projectId,
    totalBytes,
    byType: byType as UsageByType,
    assetCount,
  };
}

/**
 * Calculate total usage across all projects for a user.
 */
export function calculateUserUsage(userId: string): {
  userId: string;
  totalBytes: number;
  projectBreakdown: Record<string, number>;
} {
  const projectBreakdown: Record<string, number> = {};
  let totalBytes = 0;

  for (const asset of assets.values()) {
    if (asset.userId === userId && asset.status !== 'deleted') {
      totalBytes += asset.sizeBytes;
      projectBreakdown[asset.projectId] =
        (projectBreakdown[asset.projectId] ?? 0) + asset.sizeBytes;
    }
  }

  return { userId, totalBytes, projectBreakdown };
}

/**
 * Archive an asset to glacier storage class.
 */
export function archiveAsset(
  assetId: string,
): { success: boolean; asset?: StorageAsset; error?: string } {
  const asset = assets.get(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };
  if (asset.status === 'archived') return { success: false, error: 'Asset already archived' };
  if (asset.status === 'deleted') return { success: false, error: 'Asset is deleted' };

  const updated: StorageAsset = {
    ...asset,
    storageClass: 'glacier',
    status: 'archived',
    archivedAt: now(),
    updatedAt: now(),
  };
  assets.set(assetId, updated);

  return { success: true, asset: updated };
}

/**
 * Initiate restore of an archived asset from cold storage.
 */
export function restoreAsset(
  assetId: string,
): { success: boolean; asset?: StorageAsset; error?: string } {
  const asset = assets.get(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };
  if (asset.status !== 'archived') return { success: false, error: 'Asset is not archived' };

  const updated: StorageAsset = {
    ...asset,
    storageClass: 'hot',
    status: 'active',
    restoreRequestedAt: now(),
    archivedAt: null,
    updatedAt: now(),
  };
  assets.set(assetId, updated);

  return { success: true, asset: updated };
}

/**
 * Find and clean up orphaned files (no linked entity) and expired assets.
 */
export function cleanupOrphans(dryRun = false): {
  orphaned: string[];
  expired: string[];
  totalFreedBytes: number;
} {
  const orphaned: string[] = [];
  const expired: string[] = [];
  let totalFreedBytes = 0;

  const currentTime = new Date();

  for (const [id, asset] of assets.entries()) {
    if (asset.status === 'deleted') continue;

    const isOrphaned = asset.linkedEntityId === null && asset.status === 'active';
    const isExpired = asset.expiresAt !== null && new Date(asset.expiresAt) < currentTime;

    if (isOrphaned) {
      orphaned.push(id);
      totalFreedBytes += asset.sizeBytes;
      if (!dryRun) {
        assets.set(id, { ...asset, status: 'deleted', updatedAt: now() });
      }
    } else if (isExpired) {
      expired.push(id);
      totalFreedBytes += asset.sizeBytes;
      if (!dryRun) {
        assets.set(id, { ...asset, status: 'deleted', updatedAt: now() });
      }
    }
  }

  return { orphaned, expired, totalFreedBytes };
}

/**
 * Apply retention rules for a project — archive assets past autoArchiveDays,
 * delete assets past retentionDays if autoDeleteExpired is enabled.
 */
export function enforceRetention(projectId: string): {
  archived: string[];
  deleted: string[];
} {
  const policy = retentionPolicies.get(projectId);
  if (!policy) return { archived: [], deleted: [] };

  const archived: string[] = [];
  const deleted: string[] = [];
  const currentTime = new Date();

  for (const [id, asset] of assets.entries()) {
    if (asset.projectId !== projectId || asset.status === 'deleted') continue;
    if (policy.excludeTypes.includes(asset.assetType)) continue;

    const createdAt = new Date(asset.createdAt);
    const ageDays = (currentTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (policy.autoDeleteExpired && ageDays > policy.retentionDays && asset.status !== 'archived') {
      deleted.push(id);
      assets.set(id, { ...asset, status: 'deleted', updatedAt: now() });
    } else if (ageDays > policy.autoArchiveDays && asset.status === 'active') {
      archived.push(id);
      assets.set(id, {
        ...asset,
        status: 'archived',
        storageClass: 'glacier',
        archivedAt: now(),
        updatedAt: now(),
      });
    }
  }

  return { archived, deleted };
}

/**
 * Check a user's storage usage against their tier quota.
 */
export function checkQuota(userId: string): {
  userId: string;
  tier: StorageTier;
  usedBytes: number;
  quotaBytes: number;
  quotaLabel: string;
  usagePercent: number;
  isOverQuota: boolean;
} {
  const tier: StorageTier = userTiers.get(userId) ?? 'free';
  const quotaBytes = TIER_QUOTA_BYTES[tier];
  const quotaLabel = TIER_QUOTAS[tier];

  let usedBytes = 0;
  for (const asset of assets.values()) {
    if (asset.userId === userId && asset.status !== 'deleted') {
      usedBytes += asset.sizeBytes;
    }
  }

  const usagePercent = tier === 'enterprise' ? 0 : Math.round((usedBytes / quotaBytes) * 10000) / 100;

  return {
    userId,
    tier,
    usedBytes,
    quotaBytes,
    quotaLabel,
    usagePercent,
    isOverQuota: usedBytes > quotaBytes,
  };
}

/**
 * Get default lifecycle policies.
 */
export function getDefaultPolicies() {
  return {
    retentionDays: 365,
    autoArchiveDays: 90,
    autoDeleteExpired: false,
    tierQuotas: TIER_QUOTAS,
  };
}

/**
 * Set retention policy for a project.
 */
export function setRetentionPolicy(
  projectId: string,
  updates: Partial<Pick<RetentionPolicy, 'retentionDays' | 'autoArchiveDays' | 'autoDeleteExpired' | 'excludeTypes'>>,
): RetentionPolicy {
  const existing = retentionPolicies.get(projectId);
  const timestamp = now();

  const policy: RetentionPolicy = {
    projectId,
    retentionDays: updates.retentionDays ?? existing?.retentionDays ?? 365,
    autoArchiveDays: updates.autoArchiveDays ?? existing?.autoArchiveDays ?? 90,
    autoDeleteExpired: updates.autoDeleteExpired ?? existing?.autoDeleteExpired ?? false,
    excludeTypes: updates.excludeTypes ?? existing?.excludeTypes ?? [],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  retentionPolicies.set(projectId, policy);
  return policy;
}
