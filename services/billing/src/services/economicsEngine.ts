import { v4 as uuidv4 } from "uuid";

// --------------- Types ---------------

export type GpuClass = "CPU" | "T4" | "A10G" | "A100" | "H100";

export type EconJobType =
  | "video_preview"
  | "video_final"
  | "audio"
  | "avatar"
  | "style";

export type EconTier = "free" | "starter" | "creator" | "pro" | "studio" | "enterprise";

export interface CostBreakdown {
  compute: number;
  storage: number;
  bandwidth: number;
  governance: number;
}

export interface JobCostResult {
  credits: number;
  breakdown: CostBreakdown;
  estimatedUSD: number;
}

export interface JobParams {
  gpuClass?: GpuClass;
  durationSec?: number;
  resolutionMultiplier?: number;
  deliveryGB?: number;
}

export interface ShotEstimate {
  shotId: string;
  jobType: EconJobType;
  tier: EconTier;
  params: JobParams;
}

export interface ShotCost extends JobCostResult {
  shotId: string;
}

export interface ProjectCostEstimate {
  projectId: string;
  totalCredits: number;
  totalEstimatedUSD: number;
  shots: ShotCost[];
}

export interface DailyUsage {
  date: string;
  credits: number;
}

export interface UsageReport {
  totalCredits: number;
  byJobType: Record<string, number>;
  byTier: Record<string, number>;
  dailyUsage: DailyUsage[];
  projectedMonthly: number;
}

export interface CostSuggestion {
  id: string;
  type: "tier_downgrade" | "batch_render" | "preview_iteration" | "unused_features";
  message: string;
  estimatedSavingsPercent: number;
}

export interface RevShareResult {
  grossRevenue: number;
  platformFee: number;
  creatorShare: number;
  pendingPayout: number;
}

export interface Sale {
  saleId: string;
  amount: number;
  date: string;
}

export interface PayoutResult {
  payoutId: string;
  amount: number;
  status: "processing";
  estimatedArrival: string;
}

export interface PayoutRecord {
  payoutId: string;
  creatorId: string;
  amount: number;
  status: "processing" | "completed" | "failed";
  createdAt: string;
  estimatedArrival: string;
}

export interface PlatformRevenueReport {
  period: string;
  subscriptionRevenue: number;
  creditPurchases: number;
  marketplaceFees: number;
  totalRevenue: number;
}

// --------------- Cost Matrix ---------------

export const COST_MATRIX: Record<EconJobType, Partial<Record<GpuClass, number>>> = {
  video_preview: { T4: 0.01, A10G: 0.03 },
  video_final: { A100: 0.10, H100: 0.15 },
  audio: { CPU: 0.005 },
  avatar: { A100: 0.20 },
  style: { A10G: 0.02 },
};

/** Default GPU class per job type */
const DEFAULT_GPU: Record<EconJobType, GpuClass> = {
  video_preview: "T4",
  video_final: "A100",
  audio: "CPU",
  avatar: "A100",
  style: "A10G",
};

/** Credits-per-dollar conversion rate */
const CREDITS_PER_USD = 10;

/** Governance per-stage fee in USD */
const GOVERNANCE_FEE_USD = 0.005;

/** Storage cost per GB-hour in USD */
const STORAGE_COST_PER_GB_HOUR = 0.0001;

/** Bandwidth cost per GB in USD */
const BANDWIDTH_COST_PER_GB = 0.01;

/** Platform fee percentage for marketplace rev-share */
const PLATFORM_FEE_RATE = 0.30;

/** Creator share percentage */
const CREATOR_SHARE_RATE = 0.70;

/** Tier discount multipliers (lower = cheaper) */
const TIER_DISCOUNT: Record<EconTier, number> = {
  free: 1.0,
  starter: 0.95,
  creator: 0.90,
  pro: 0.85,
  studio: 0.75,
  enterprise: 0.60,
};

// --------------- In-memory stores ---------------

const usageLog: Array<{
  userId: string;
  jobType: EconJobType;
  tier: EconTier;
  credits: number;
  date: string;
}> = [];

const payoutStore: PayoutRecord[] = [];

const platformRevenue: {
  subscriptionRevenue: number;
  creditPurchases: number;
  marketplaceFees: number;
} = {
  subscriptionRevenue: 0,
  creditPurchases: 0,
  marketplaceFees: 0,
};

// --------------- Core Functions ---------------

/**
 * Calculate the cost for a single render job.
 */
export function calculateJobCost(
  jobType: EconJobType,
  tier: EconTier,
  params: JobParams = {},
): JobCostResult {
  const gpuClass = params.gpuClass ?? DEFAULT_GPU[jobType];
  const gpuRates = COST_MATRIX[jobType];
  const baseRate = gpuRates[gpuClass];

  if (baseRate === undefined) {
    throw new Error(
      `GPU class '${gpuClass}' not available for job type '${jobType}'`,
    );
  }

  const duration = params.durationSec ?? 10;
  const resMultiplier = params.resolutionMultiplier ?? 1;
  const deliveryGB = params.deliveryGB ?? 0.1;

  // Compute cost: base rate * duration * resolution multiplier
  const computeUSD = baseRate * duration * resMultiplier;

  // Storage cost: size estimate based on resolution & duration
  const storageSizeGB = (duration / 10) * resMultiplier * 0.5;
  const storageHours = 24; // default retention
  const storageUSD = storageSizeGB * storageHours * STORAGE_COST_PER_GB_HOUR;

  // Bandwidth cost
  const bandwidthUSD = deliveryGB * BANDWIDTH_COST_PER_GB;

  // Governance fee (single stage)
  const governanceUSD = GOVERNANCE_FEE_USD;

  // Total before tier discount
  const totalUSD = computeUSD + storageUSD + bandwidthUSD + governanceUSD;

  // Apply tier discount
  const discount = TIER_DISCOUNT[tier] ?? 1.0;
  const discountedUSD = totalUSD * discount;

  // Convert to credits
  const credits = Math.round(discountedUSD * CREDITS_PER_USD * 100) / 100;

  return {
    credits,
    breakdown: {
      compute: Math.round(computeUSD * discount * 10000) / 10000,
      storage: Math.round(storageUSD * discount * 10000) / 10000,
      bandwidth: Math.round(bandwidthUSD * discount * 10000) / 10000,
      governance: Math.round(governanceUSD * discount * 10000) / 10000,
    },
    estimatedUSD: Math.round(discountedUSD * 10000) / 10000,
  };
}

/**
 * Estimate total cost for a project composed of multiple shots.
 */
export function estimateProjectCost(
  projectId: string,
  shots: ShotEstimate[],
): ProjectCostEstimate {
  const shotCosts: ShotCost[] = shots.map((shot) => {
    const cost = calculateJobCost(shot.jobType, shot.tier, shot.params);
    return { shotId: shot.shotId, ...cost };
  });

  const totalCredits = shotCosts.reduce((sum, s) => sum + s.credits, 0);
  const totalEstimatedUSD = shotCosts.reduce((sum, s) => sum + s.estimatedUSD, 0);

  return {
    projectId,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalEstimatedUSD: Math.round(totalEstimatedUSD * 10000) / 10000,
    shots: shotCosts,
  };
}

/**
 * Get usage report for a user over a given period.
 */
export function getUsageReport(
  userId: string,
  period: string,
): UsageReport {
  const entries = usageLog.filter(
    (e) => e.userId === userId && e.date.startsWith(period),
  );

  const totalCredits = entries.reduce((sum, e) => sum + e.credits, 0);

  const byJobType: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};

  for (const entry of entries) {
    byJobType[entry.jobType] = (byJobType[entry.jobType] ?? 0) + entry.credits;
    byTier[entry.tier] = (byTier[entry.tier] ?? 0) + entry.credits;
    const day = entry.date.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + entry.credits;
  }

  const dailyUsage: DailyUsage[] = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, credits]) => ({ date, credits }));

  // Project monthly usage from daily average
  const daysInPeriod = dailyUsage.length || 1;
  const dailyAvg = totalCredits / daysInPeriod;
  const projectedMonthly = Math.round(dailyAvg * 30 * 100) / 100;

  return {
    totalCredits,
    byJobType,
    byTier,
    dailyUsage,
    projectedMonthly,
  };
}

/**
 * Generate AI-driven cost optimization suggestions for a user.
 */
export function optimizeCostSuggestions(userId: string): CostSuggestion[] {
  const entries = usageLog.filter((e) => e.userId === userId);
  const suggestions: CostSuggestion[] = [];

  // Check if user uses final renders heavily — suggest preview for iteration
  const finalRenders = entries.filter((e) => e.jobType === "video_final");
  const previewRenders = entries.filter((e) => e.jobType === "video_preview");

  if (finalRenders.length > 3 && previewRenders.length < finalRenders.length) {
    suggestions.push({
      id: uuidv4(),
      type: "preview_iteration",
      message:
        "Use preview tier for iteration — switch to final only for approved shots. Preview renders cost up to 85% less.",
      estimatedSavingsPercent: 40,
    });
  }

  // Suggest batch renders if many small jobs
  if (entries.length > 5) {
    suggestions.push({
      id: uuidv4(),
      type: "batch_render",
      message:
        "Batch renders save up to 30%. Group similar shots into batch jobs to reduce per-job overhead.",
      estimatedSavingsPercent: 30,
    });
  }

  // Check tier usage — suggest downgrade if on expensive tier with low usage
  const totalCredits = entries.reduce((sum, e) => sum + e.credits, 0);
  const highTierEntries = entries.filter(
    (e) => e.tier === "studio" || e.tier === "enterprise",
  );

  if (highTierEntries.length > 0 && totalCredits < 50) {
    suggestions.push({
      id: uuidv4(),
      type: "tier_downgrade",
      message:
        "Your usage is low for your current tier. Consider downgrading to save on subscription costs.",
      estimatedSavingsPercent: 25,
    });
  }

  // Default suggestion if none generated
  if (suggestions.length === 0) {
    suggestions.push({
      id: uuidv4(),
      type: "unused_features",
      message:
        "Review your active features — disabling unused add-ons can reduce monthly costs.",
      estimatedSavingsPercent: 10,
    });
  }

  return suggestions;
}

/**
 * Calculate revenue share for a creator based on their sales.
 */
export function calculateRevShare(
  _creatorId: string,
  sales: Sale[],
): RevShareResult {
  const grossRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const platformFee = Math.round(grossRevenue * PLATFORM_FEE_RATE * 100) / 100;
  const creatorShare = Math.round(grossRevenue * CREATOR_SHARE_RATE * 100) / 100;

  // Track marketplace fees in platform revenue
  platformRevenue.marketplaceFees += platformFee;

  return {
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    platformFee,
    creatorShare,
    pendingPayout: creatorShare,
  };
}

/**
 * Process a payout to a creator.
 */
export function processCreatorPayout(
  creatorId: string,
  amount: number,
): PayoutResult {
  if (amount <= 0) {
    throw new Error("Payout amount must be positive");
  }

  const payoutId = uuidv4();
  const now = new Date();
  const arrival = new Date(now);
  arrival.setDate(arrival.getDate() + 5); // 5 business day estimate

  const record: PayoutRecord = {
    payoutId,
    creatorId,
    amount,
    status: "processing",
    createdAt: now.toISOString(),
    estimatedArrival: arrival.toISOString(),
  };

  payoutStore.push(record);

  return {
    payoutId,
    amount,
    status: "processing",
    estimatedArrival: arrival.toISOString(),
  };
}

/**
 * Get payout history for a creator.
 */
export function getPayoutHistory(creatorId: string): PayoutRecord[] {
  return payoutStore.filter((p) => p.creatorId === creatorId);
}

/**
 * Get platform-wide revenue report for a period.
 */
export function getPlatformRevenue(period: string): PlatformRevenueReport {
  return {
    period,
    subscriptionRevenue: platformRevenue.subscriptionRevenue,
    creditPurchases: platformRevenue.creditPurchases,
    marketplaceFees: platformRevenue.marketplaceFees,
    totalRevenue:
      platformRevenue.subscriptionRevenue +
      platformRevenue.creditPurchases +
      platformRevenue.marketplaceFees,
  };
}

// --------------- Internal Helpers ---------------

/**
 * Record a usage entry (called internally or from routes for tracking).
 */
export function recordUsage(
  userId: string,
  jobType: EconJobType,
  tier: EconTier,
  credits: number,
): void {
  usageLog.push({
    userId,
    jobType,
    tier,
    credits,
    date: new Date().toISOString(),
  });
}

/**
 * Add to platform subscription revenue (called from billing flows).
 */
export function addSubscriptionRevenue(amount: number): void {
  platformRevenue.subscriptionRevenue += amount;
}

/**
 * Add to platform credit purchase revenue.
 */
export function addCreditPurchaseRevenue(amount: number): void {
  platformRevenue.creditPurchases += amount;
}

/**
 * Reset all in-memory stores (for testing).
 */
export function _resetEconomicsStores(): void {
  usageLog.length = 0;
  payoutStore.length = 0;
  platformRevenue.subscriptionRevenue = 0;
  platformRevenue.creditPurchases = 0;
  platformRevenue.marketplaceFees = 0;
}
