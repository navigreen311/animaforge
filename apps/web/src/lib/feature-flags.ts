/**
 * AnimaForge Feature Flag System — DB-backed with in-memory fallback
 */

// Default flags configuration (used when DB is unavailable)
const DEFAULT_FLAGS: Record<string, { enabled: boolean; rolloutPct: number; description: string }> = {
  batch_generation: { enabled: true, rolloutPct: 100, description: 'Batch generate multiple shots at once' },
  avatar_studio_v2: { enabled: false, rolloutPct: 0, description: 'Next-gen avatar creation pipeline' },
  live_runtime: { enabled: false, rolloutPct: 20, description: 'Real-time animation preview' },
  content_repurpose: { enabled: true, rolloutPct: 100, description: 'Social media content repurposing' },
  auto_edit: { enabled: true, rolloutPct: 50, description: 'AI director mode for rough cuts' },
};

/**
 * Deterministic bucket assignment for consistent rollout
 */
function hashToBucket(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a feature flag is enabled for a given user
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string
): Promise<boolean> {
  const flag = DEFAULT_FLAGS[flagKey];
  if (!flag || !flag.enabled) return false;

  // Deterministic rollout based on userId hash
  const bucket = hashToBucket(userId);
  return bucket < flag.rolloutPct;
}

/**
 * React hook for feature flags (client-side, synchronous)
 */
export function useFeatureFlag(flagKey: string): boolean {
  const flag = DEFAULT_FLAGS[flagKey];
  return flag?.enabled && flag.rolloutPct === 100 ? true : false;
}

/**
 * Get all flags (for admin panel)
 */
export function getAllFlags() {
  return Object.entries(DEFAULT_FLAGS).map(([key, config]) => ({
    key,
    ...config,
  }));
}
