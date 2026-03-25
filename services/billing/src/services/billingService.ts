import { v4 as uuidv4 } from "uuid";
import prisma from "../db";
import type {
  Subscription,
  CreditBalance,
  CreditTransaction,
  SubscriptionTier,
  JobType,
} from "../models/billingSchemas";

/** Credit cost per job type */
const CREDIT_COSTS: Record<string, number> = {
  video_10s_preview: 1,
  video_10s_final: 5,
  video_30s_preview: 2,
  video_30s_final: 12,
  avatar_reconstruction: 10,
  style_clone: 2,
  img_to_cartoon: 0.5,
  script_generation: 1,
  music_30s: 2,
  audio_voice_30s: 1,
  auto_qc: 0.5,
};

/** Tier credit allowances per billing period */
const TIER_CREDITS: Record<string, number> = {
  free: 10,
  starter: 50,
  creator: 100,
  pro: 300,
  studio: 1000,
  enterprise: 5000,
};

/** In-memory fallback stores (used when Prisma is unavailable) */
const memSubscriptions = new Map<string, Subscription>();
const memCreditBalances = new Map<string, CreditBalance>();
const memTransactions: CreditTransaction[] = [];

function currentISO(): string {
  return new Date().toISOString();
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

// --------------- Subscriptions ---------------

export async function subscribeTier(
  userId: string,
  tier: SubscriptionTier,
): Promise<Subscription> {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    if (existing) {
      throw new Error("User already has an active subscription");
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        userId,
        stripeId: `local_${uuidv4()}`,
        tier,
        status: "active",
        currentPeriodEnd: periodEnd,
      },
    });

    // Initialize usage meter for current period
    await prisma.usageMeter.upsert({
      where: { userId_period: { userId, period: currentPeriod() } },
      create: { userId, period: currentPeriod(), credits: 0 },
      update: {},
    });

    return {
      id: sub.id,
      userId: sub.userId,
      tier: sub.tier as SubscriptionTier,
      status: sub.status as "active" | "cancelled",
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.createdAt.toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("already has")) throw err;

    // In-memory fallback
    if (memSubscriptions.has(userId)) {
      throw new Error("User already has an active subscription");
    }

    const sub: Subscription = {
      id: uuidv4(),
      userId,
      tier,
      status: "active",
      createdAt: currentISO(),
      updatedAt: currentISO(),
    };
    memSubscriptions.set(userId, sub);

    if (!memCreditBalances.has(userId)) {
      memCreditBalances.set(userId, {
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      });
    }

    return sub;
  }
}

/** Backward-compatible sync alias for routes/tests */
export function subscribe(userId: string, tier: SubscriptionTier): Subscription {
  if (memSubscriptions.has(userId)) {
    throw new Error("User already has an active subscription");
  }

  const sub: Subscription = {
    id: uuidv4(),
    userId,
    tier,
    status: "active",
    createdAt: currentISO(),
    updatedAt: currentISO(),
  };
  memSubscriptions.set(userId, sub);

  if (!memCreditBalances.has(userId)) {
    memCreditBalances.set(userId, {
      userId,
      balance: 0,
      usageThisPeriod: 0,
      periodStart: periodStart(),
    });
  }

  return sub;
}

export async function getSubscription(
  userId: string,
): Promise<Subscription | undefined> {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    if (!sub) return memSubscriptions.get(userId);

    return {
      id: sub.id,
      userId: sub.userId,
      tier: sub.tier as SubscriptionTier,
      status: sub.status as "active" | "cancelled",
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.createdAt.toISOString(),
    };
  } catch {
    return memSubscriptions.get(userId);
  }
}

export async function changeTier(
  userId: string,
  newTier: SubscriptionTier,
): Promise<Subscription> {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    if (!existing) {
      throw new Error("No active subscription found for user");
    }

    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { tier: newTier },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      tier: updated.tier as SubscriptionTier,
      status: updated.status as "active" | "cancelled",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.createdAt.toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("No active")) throw err;

    // In-memory fallback
    const sub = memSubscriptions.get(userId);
    if (!sub || sub.status === "cancelled") {
      throw new Error("No active subscription found for user");
    }
    sub.tier = newTier;
    sub.updatedAt = currentISO();
    memSubscriptions.set(userId, sub);
    return sub;
  }
}

/** Backward-compatible sync alias for routes/tests */
export function updateSubscription(
  userId: string,
  tier: SubscriptionTier,
): Subscription {
  const sub = memSubscriptions.get(userId);
  if (!sub || sub.status === "cancelled") {
    throw new Error("No active subscription found for user");
  }
  sub.tier = tier;
  sub.updatedAt = currentISO();
  memSubscriptions.set(userId, sub);
  return sub;
}

export async function cancelSubscription(
  userId: string,
): Promise<Subscription> {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    if (!existing) {
      throw new Error("No active subscription found for user");
    }

    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      tier: updated.tier as SubscriptionTier,
      status: "cancelled",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.createdAt.toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("No active")) throw err;

    // In-memory fallback
    const sub = memSubscriptions.get(userId);
    if (!sub || sub.status === "cancelled") {
      throw new Error("No active subscription found for user");
    }
    sub.status = "cancelled";
    sub.updatedAt = currentISO();
    memSubscriptions.set(userId, sub);
    return sub;
  }
}

// --------------- Credits ---------------

export async function deductCredits(
  userId: string,
  jobType: JobType,
  tier: SubscriptionTier,
): Promise<CreditBalance> {
  const cost = CREDIT_COSTS[jobType];
  if (cost === undefined) {
    throw new Error(`Unknown job type: ${jobType}`);
  }

  const period = currentPeriod();
  const tierCredits = TIER_CREDITS[tier] ?? 0;

  try {
    const meter = await prisma.usageMeter.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, credits: 0 },
      update: {},
    });

    const remaining = tierCredits - meter.credits;
    if (remaining < cost) {
      throw new Error("Insufficient credits");
    }

    const updated = await prisma.usageMeter.update({
      where: { id: meter.id },
      data: { credits: meter.credits + cost },
    });

    return {
      userId,
      balance: tierCredits - updated.credits,
      usageThisPeriod: updated.credits,
      periodStart: periodStart(),
    };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Insufficient") ||
        err.message.includes("Unknown job"))
    )
      throw err;

    // In-memory fallback
    let bal = memCreditBalances.get(userId);
    if (!bal) {
      bal = {
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      };
    }

    if (bal.balance < cost) {
      throw new Error("Insufficient credits");
    }

    bal.balance -= cost;
    bal.usageThisPeriod += cost;
    memCreditBalances.set(userId, bal);

    memTransactions.push({
      id: uuidv4(),
      userId,
      amount: -cost,
      type: "deduction",
      jobType,
      createdAt: currentISO(),
    });

    return bal;
  }
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  const period = currentPeriod();

  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    const tierCredits = sub ? (TIER_CREDITS[sub.tier] ?? 0) : 0;

    const meter = await prisma.usageMeter.findUnique({
      where: { userId_period: { userId, period } },
    });

    const used = meter?.credits ?? 0;

    return {
      userId,
      balance: tierCredits - used,
      usageThisPeriod: used,
      periodStart: periodStart(),
    };
  } catch {
    const bal = memCreditBalances.get(userId);
    if (!bal) {
      return {
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      };
    }
    return bal;
  }
}

/** Backward-compatible sync alias for routes/tests */
export function getCredits(userId: string): CreditBalance {
  const bal = memCreditBalances.get(userId);
  if (!bal) {
    return {
      userId,
      balance: 0,
      usageThisPeriod: 0,
      periodStart: periodStart(),
    };
  }
  return bal;
}

export async function topUp(
  userId: string,
  credits: number,
): Promise<CreditBalance> {
  const period = currentPeriod();

  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });

    const tierCredits = sub ? (TIER_CREDITS[sub.tier] ?? 0) : 0;

    const meter = await prisma.usageMeter.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, credits: -credits },
      update: { credits: { decrement: credits } },
    });

    return {
      userId,
      balance: tierCredits - meter.credits,
      usageThisPeriod: Math.max(0, meter.credits),
      periodStart: periodStart(),
    };
  } catch {
    let bal = memCreditBalances.get(userId);
    if (!bal) {
      bal = {
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      };
    }
    bal.balance += credits;
    memCreditBalances.set(userId, bal);

    memTransactions.push({
      id: uuidv4(),
      userId,
      amount: credits,
      type: "topup",
      createdAt: currentISO(),
    });

    return bal;
  }
}

// --------------- Webhook ---------------

export function handleStripeWebhook(
  type: string,
  _data?: Record<string, unknown>,
): { received: boolean } {
  console.log(`[Stripe Webhook] type=${type}`);
  return { received: true };
}

// --------------- Helpers ---------------

export function getCreditCost(jobType: string): number | undefined {
  return CREDIT_COSTS[jobType];
}

export function getTierCredits(tier: string): number {
  return TIER_CREDITS[tier] ?? 0;
}

export function _resetStores(): void {
  memSubscriptions.clear();
  memCreditBalances.clear();
  memTransactions.length = 0;
}
