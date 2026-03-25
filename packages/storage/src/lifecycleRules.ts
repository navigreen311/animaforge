/**
 * S3 lifecycle configuration helpers for AnimaForge storage tiers.
 */

export interface StorageTier {
  name: string;
  description: string;
  transitionDays: number | null;
  storageClass: string;
}

export const STORAGE_TIERS = {
  hot: {
    name: "hot",
    description: "S3 Standard — frequently accessed data",
    transitionDays: null,
    storageClass: "STANDARD",
  },
  warm: {
    name: "warm",
    description: "S3 Infrequent Access — after 30 days",
    transitionDays: 30,
    storageClass: "STANDARD_IA",
  },
  cold: {
    name: "cold",
    description: "S3 Glacier — after 90 days",
    transitionDays: 90,
    storageClass: "GLACIER",
  },
} as const satisfies Record<string, StorageTier>;

export type TierName = keyof typeof STORAGE_TIERS;

export interface LifecycleRule {
  ID: string;
  Filter: { Prefix: string };
  Status: "Enabled";
  Transitions: { Days: number; StorageClass: string }[];
}

/**
 * Build an S3 lifecycle rule that transitions objects through the
 * requested tier (and all tiers below it).
 *
 * - `hot`  → no transitions (objects stay in STANDARD)
 * - `warm` → transition to STANDARD_IA at 30 days
 * - `cold` → transition to STANDARD_IA at 30 days, then GLACIER at 90 days
 */
export function getLifecyclePolicy(
  tier: TierName,
  prefix: string = "",
): LifecycleRule {
  const transitions: { Days: number; StorageClass: string }[] = [];

  if (tier === "warm" || tier === "cold") {
    transitions.push({
      Days: STORAGE_TIERS.warm.transitionDays!,
      StorageClass: STORAGE_TIERS.warm.storageClass,
    });
  }

  if (tier === "cold") {
    transitions.push({
      Days: STORAGE_TIERS.cold.transitionDays!,
      StorageClass: STORAGE_TIERS.cold.storageClass,
    });
  }

  return {
    ID: `animaforge-${tier}-lifecycle`,
    Filter: { Prefix: prefix },
    Status: "Enabled",
    Transitions: transitions,
  };
}
