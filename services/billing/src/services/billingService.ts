import { v4 as uuidv4 } from "uuid";
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

/** In-memory stores */
const subscriptions = new Map<string, Subscription>();
const creditBalances = new Map<string, CreditBalance>();
const transactions: CreditTransaction[] = [];

function currentISO(): string {
  return new Date().toISOString();
}

function periodStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

// --------------- Subscriptions ---------------

export function subscribe(userId: string, tier: SubscriptionTier): Subscription {
  if (subscriptions.has(userId)) {
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
  subscriptions.set(userId, sub);

  // Initialise credit balance if not present
  if (!creditBalances.has(userId)) {
    creditBalances.set(userId, {
      userId,
      balance: 0,
      usageThisPeriod: 0,
      periodStart: periodStart(),
    });
  }

  return sub;
}

export function getSubscription(userId: string): Subscription | undefined {
  return subscriptions.get(userId);
}

export function updateSubscription(userId: string, tier: SubscriptionTier): Subscription {
  const sub = subscriptions.get(userId);
  if (!sub || sub.status === "cancelled") {
    throw new Error("No active subscription found for user");
  }
  sub.tier = tier;
  sub.updatedAt = currentISO();
  subscriptions.set(userId, sub);
  return sub;
}

export function cancelSubscription(userId: string): Subscription {
  const sub = subscriptions.get(userId);
  if (!sub || sub.status === "cancelled") {
    throw new Error("No active subscription found for user");
  }
  sub.status = "cancelled";
  sub.updatedAt = currentISO();
  subscriptions.set(userId, sub);
  return sub;
}

// --------------- Credits ---------------

export function topUp(userId: string, amount: number): CreditBalance {
  let bal = creditBalances.get(userId);
  if (!bal) {
    bal = { userId, balance: 0, usageThisPeriod: 0, periodStart: periodStart() };
  }
  bal.balance += amount;
  creditBalances.set(userId, bal);

  transactions.push({
    id: uuidv4(),
    userId,
    amount,
    type: "topup",
    createdAt: currentISO(),
  });

  return bal;
}

export function getCredits(userId: string): CreditBalance {
  const bal = creditBalances.get(userId);
  if (!bal) {
    return { userId, balance: 0, usageThisPeriod: 0, periodStart: periodStart() };
  }
  return bal;
}

export function deductCredits(
  userId: string,
  jobType: JobType,
  _tier: SubscriptionTier,
): CreditBalance {
  const cost = CREDIT_COSTS[jobType];
  if (cost === undefined) {
    throw new Error(`Unknown job type: ${jobType}`);
  }

  let bal = creditBalances.get(userId);
  if (!bal) {
    bal = { userId, balance: 0, usageThisPeriod: 0, periodStart: periodStart() };
  }

  if (bal.balance < cost) {
    throw new Error("Insufficient credits");
  }

  bal.balance -= cost;
  bal.usageThisPeriod += cost;
  creditBalances.set(userId, bal);

  transactions.push({
    id: uuidv4(),
    userId,
    amount: -cost,
    type: "deduction",
    jobType,
    createdAt: currentISO(),
  });

  return bal;
}

// --------------- Webhook ---------------

export function handleStripeWebhook(type: string, _data?: Record<string, unknown>): { received: boolean } {
  // Stub: log and acknowledge
  console.log(`[Stripe Webhook] type=${type}`);
  return { received: true };
}

// --------------- Test helpers ---------------

export function _resetStores(): void {
  subscriptions.clear();
  creditBalances.clear();
  transactions.length = 0;
}

export function getCreditCost(jobType: string): number | undefined {
  return CREDIT_COSTS[jobType];
}
