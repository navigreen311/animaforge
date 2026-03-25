#!/usr/bin/env python3
"""Generate billing service files. Run from repo root."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BT = "`"  # backtick

def w(relpath, content):
    path = os.path.join(HERE, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="\n") as f:
        f.write(content)
    print(f"wrote {path}")


# ===== billingService.ts =====
w("services/billingService.ts", f'''import {{ v4 as uuidv4 }} from "uuid";
import prisma from "../db";
import type {{
  Subscription,
  CreditBalance,
  CreditTransaction,
  SubscriptionTier,
  JobType,
}} from "../models/billingSchemas";

/** Credit cost per job type */
const CREDIT_COSTS: Record<string, number> = {{
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
}};

/** Tier credit allowances per billing period */
const TIER_CREDITS: Record<string, number> = {{
  free: 10,
  starter: 50,
  creator: 100,
  pro: 300,
  studio: 1000,
  enterprise: 5000,
}};

/** In-memory fallback stores (used when Prisma is unavailable) */
const memSubscriptions = new Map<string, Subscription>();
const memCreditBalances = new Map<string, CreditBalance>();
const memTransactions: CreditTransaction[] = [];

function currentISO(): string {{
  return new Date().toISOString();
}}

function currentPeriod(): string {{
  const d = new Date();
  return {BT}${{d.getFullYear()}}-${{String(d.getMonth() + 1).padStart(2, "0")}}{BT};
}}

function periodStart(): string {{
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}}

// --------------- Subscriptions ---------------

export async function subscribeTier(
  userId: string,
  tier: SubscriptionTier,
): Promise<Subscription> {{
  try {{
    const existing = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    if (existing) {{
      throw new Error("User already has an active subscription");
    }}

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.subscription.create({{
      data: {{
        userId,
        stripeId: {BT}local_${{uuidv4()}}{BT},
        tier,
        status: "active",
        currentPeriodEnd: periodEnd,
      }},
    }});

    // Initialize usage meter for current period
    await prisma.usageMeter.upsert({{
      where: {{ userId_period: {{ userId, period: currentPeriod() }} }},
      create: {{ userId, period: currentPeriod(), credits: 0 }},
      update: {{}},
    }});

    return {{
      id: sub.id,
      userId: sub.userId,
      tier: sub.tier as SubscriptionTier,
      status: sub.status as "active" | "cancelled",
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.createdAt.toISOString(),
    }};
  }} catch (err) {{
    if (err instanceof Error && err.message.includes("already has")) throw err;

    // In-memory fallback
    if (memSubscriptions.has(userId)) {{
      throw new Error("User already has an active subscription");
    }}

    const sub: Subscription = {{
      id: uuidv4(),
      userId,
      tier,
      status: "active",
      createdAt: currentISO(),
      updatedAt: currentISO(),
    }};
    memSubscriptions.set(userId, sub);

    if (!memCreditBalances.has(userId)) {{
      memCreditBalances.set(userId, {{
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      }});
    }}

    return sub;
  }}
}}

/** Backward-compatible sync alias for routes/tests */
export function subscribe(userId: string, tier: SubscriptionTier): Subscription {{
  if (memSubscriptions.has(userId)) {{
    throw new Error("User already has an active subscription");
  }}

  const sub: Subscription = {{
    id: uuidv4(),
    userId,
    tier,
    status: "active",
    createdAt: currentISO(),
    updatedAt: currentISO(),
  }};
  memSubscriptions.set(userId, sub);

  if (!memCreditBalances.has(userId)) {{
    memCreditBalances.set(userId, {{
      userId,
      balance: 0,
      usageThisPeriod: 0,
      periodStart: periodStart(),
    }});
  }}

  return sub;
}}

export async function getSubscription(
  userId: string,
): Promise<Subscription | undefined> {{
  try {{
    const sub = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    if (!sub) return memSubscriptions.get(userId);

    return {{
      id: sub.id,
      userId: sub.userId,
      tier: sub.tier as SubscriptionTier,
      status: sub.status as "active" | "cancelled",
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.createdAt.toISOString(),
    }};
  }} catch {{
    return memSubscriptions.get(userId);
  }}
}}

export async function changeTier(
  userId: string,
  newTier: SubscriptionTier,
): Promise<Subscription> {{
  try {{
    const existing = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    if (!existing) {{
      throw new Error("No active subscription found for user");
    }}

    const updated = await prisma.subscription.update({{
      where: {{ id: existing.id }},
      data: {{ tier: newTier }},
    }});

    return {{
      id: updated.id,
      userId: updated.userId,
      tier: updated.tier as SubscriptionTier,
      status: updated.status as "active" | "cancelled",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.createdAt.toISOString(),
    }};
  }} catch (err) {{
    if (err instanceof Error && err.message.includes("No active")) throw err;

    // In-memory fallback
    const sub = memSubscriptions.get(userId);
    if (!sub || sub.status === "cancelled") {{
      throw new Error("No active subscription found for user");
    }}
    sub.tier = newTier;
    sub.updatedAt = currentISO();
    memSubscriptions.set(userId, sub);
    return sub;
  }}
}}

/** Backward-compatible sync alias for routes/tests */
export function updateSubscription(
  userId: string,
  tier: SubscriptionTier,
): Subscription {{
  const sub = memSubscriptions.get(userId);
  if (!sub || sub.status === "cancelled") {{
    throw new Error("No active subscription found for user");
  }}
  sub.tier = tier;
  sub.updatedAt = currentISO();
  memSubscriptions.set(userId, sub);
  return sub;
}}

export async function cancelSubscription(
  userId: string,
): Promise<Subscription> {{
  try {{
    const existing = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    if (!existing) {{
      throw new Error("No active subscription found for user");
    }}

    const updated = await prisma.subscription.update({{
      where: {{ id: existing.id }},
      data: {{ status: "cancelled" }},
    }});

    return {{
      id: updated.id,
      userId: updated.userId,
      tier: updated.tier as SubscriptionTier,
      status: "cancelled",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.createdAt.toISOString(),
    }};
  }} catch (err) {{
    if (err instanceof Error && err.message.includes("No active")) throw err;

    // In-memory fallback
    const sub = memSubscriptions.get(userId);
    if (!sub || sub.status === "cancelled") {{
      throw new Error("No active subscription found for user");
    }}
    sub.status = "cancelled";
    sub.updatedAt = currentISO();
    memSubscriptions.set(userId, sub);
    return sub;
  }}
}}

// --------------- Credits ---------------

export async function deductCredits(
  userId: string,
  jobType: JobType,
  tier: SubscriptionTier,
): Promise<CreditBalance> {{
  const cost = CREDIT_COSTS[jobType];
  if (cost === undefined) {{
    throw new Error({BT}Unknown job type: ${{jobType}}{BT});
  }}

  const period = currentPeriod();
  const tierCredits = TIER_CREDITS[tier] ?? 0;

  try {{
    const meter = await prisma.usageMeter.upsert({{
      where: {{ userId_period: {{ userId, period }} }},
      create: {{ userId, period, credits: 0 }},
      update: {{}},
    }});

    const remaining = tierCredits - meter.credits;
    if (remaining < cost) {{
      throw new Error("Insufficient credits");
    }}

    const updated = await prisma.usageMeter.update({{
      where: {{ id: meter.id }},
      data: {{ credits: meter.credits + cost }},
    }});

    return {{
      userId,
      balance: tierCredits - updated.credits,
      usageThisPeriod: updated.credits,
      periodStart: periodStart(),
    }};
  }} catch (err) {{
    if (
      err instanceof Error &&
      (err.message.includes("Insufficient") ||
        err.message.includes("Unknown job"))
    )
      throw err;

    // In-memory fallback
    let bal = memCreditBalances.get(userId);
    if (!bal) {{
      bal = {{
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      }};
    }}

    if (bal.balance < cost) {{
      throw new Error("Insufficient credits");
    }}

    bal.balance -= cost;
    bal.usageThisPeriod += cost;
    memCreditBalances.set(userId, bal);

    memTransactions.push({{
      id: uuidv4(),
      userId,
      amount: -cost,
      type: "deduction",
      jobType,
      createdAt: currentISO(),
    }});

    return bal;
  }}
}}

export async function getBalance(userId: string): Promise<CreditBalance> {{
  const period = currentPeriod();

  try {{
    const sub = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    const tierCredits = sub ? (TIER_CREDITS[sub.tier] ?? 0) : 0;

    const meter = await prisma.usageMeter.findUnique({{
      where: {{ userId_period: {{ userId, period }} }},
    }});

    const used = meter?.credits ?? 0;

    return {{
      userId,
      balance: tierCredits - used,
      usageThisPeriod: used,
      periodStart: periodStart(),
    }};
  }} catch {{
    const bal = memCreditBalances.get(userId);
    if (!bal) {{
      return {{
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      }};
    }}
    return bal;
  }}
}}

/** Backward-compatible sync alias for routes/tests */
export function getCredits(userId: string): CreditBalance {{
  const bal = memCreditBalances.get(userId);
  if (!bal) {{
    return {{
      userId,
      balance: 0,
      usageThisPeriod: 0,
      periodStart: periodStart(),
    }};
  }}
  return bal;
}}

export async function topUp(
  userId: string,
  credits: number,
): Promise<CreditBalance> {{
  const period = currentPeriod();

  try {{
    const sub = await prisma.subscription.findFirst({{
      where: {{ userId, status: "active" }},
    }});

    const tierCredits = sub ? (TIER_CREDITS[sub.tier] ?? 0) : 0;

    const meter = await prisma.usageMeter.upsert({{
      where: {{ userId_period: {{ userId, period }} }},
      create: {{ userId, period, credits: -credits }},
      update: {{ credits: {{ decrement: credits }} }},
    }});

    return {{
      userId,
      balance: tierCredits - meter.credits,
      usageThisPeriod: Math.max(0, meter.credits),
      periodStart: periodStart(),
    }};
  }} catch {{
    let bal = memCreditBalances.get(userId);
    if (!bal) {{
      bal = {{
        userId,
        balance: 0,
        usageThisPeriod: 0,
        periodStart: periodStart(),
      }};
    }}
    bal.balance += credits;
    memCreditBalances.set(userId, bal);

    memTransactions.push({{
      id: uuidv4(),
      userId,
      amount: credits,
      type: "topup",
      createdAt: currentISO(),
    }});

    return bal;
  }}
}}

// --------------- Webhook ---------------

export function handleStripeWebhook(
  type: string,
  _data?: Record<string, unknown>,
): {{ received: boolean }} {{
  console.log({BT}[Stripe Webhook] type=${{type}}{BT});
  return {{ received: true }};
}}

// --------------- Helpers ---------------

export function getCreditCost(jobType: string): number | undefined {{
  return CREDIT_COSTS[jobType];
}}

export function getTierCredits(tier: string): number {{
  return TIER_CREDITS[tier] ?? 0;
}}

export function _resetStores(): void {{
  memSubscriptions.clear();
  memCreditBalances.clear();
  memTransactions.length = 0;
}}
''')


# ===== stripeService.ts =====
w("services/stripeService.ts", f'''import Stripe from "stripe";
import {{ v4 as uuidv4 }} from "uuid";
import * as billingService from "./billingService";

// --------------- Stripe Client ---------------

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {{
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
}});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// --------------- Pricing / Price ID Configuration ---------------

export interface PlanConfig {{
  tier: string;
  name: string;
  stripePriceId: string;
  priceMonthly: number;
  credits: number;
}}

/** Map tiers to Stripe price IDs (set via env or defaults for dev) */
const STRIPE_PRICE_IDS: Record<string, string> = {{
  free: process.env.STRIPE_PRICE_FREE ?? "price_free_000",
  creator: process.env.STRIPE_PRICE_CREATOR ?? "price_creator_029",
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro_049",
  studio: process.env.STRIPE_PRICE_STUDIO ?? "price_studio_099",
}};

export const PRICING: Record<string, PlanConfig> = {{
  free: {{
    tier: "free",
    name: "Free",
    stripePriceId: STRIPE_PRICE_IDS.free,
    priceMonthly: 0,
    credits: 10,
  }},
  creator: {{
    tier: "creator",
    name: "Creator",
    stripePriceId: STRIPE_PRICE_IDS.creator,
    priceMonthly: 2900,
    credits: 100,
  }},
  pro: {{
    tier: "pro",
    name: "Pro",
    stripePriceId: STRIPE_PRICE_IDS.pro,
    priceMonthly: 4900,
    credits: 300,
  }},
  studio: {{
    tier: "studio",
    name: "Studio",
    stripePriceId: STRIPE_PRICE_IDS.studio,
    priceMonthly: 9900,
    credits: 1000,
  }},
}};

// --------------- Checkout Sessions ---------------

export interface CheckoutSessionResult {{
  id: string;
  url: string | null;
}}

export async function createCheckoutSession(
  userId: string,
  tier: string,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutSessionResult> {{
  const plan = PRICING[tier];
  if (!plan) {{
    throw new Error({BT}Unknown tier: ${{tier}}{BT});
  }}

  try {{
    const session = await stripe.checkout.sessions.create({{
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {{
          price: plan.stripePriceId,
          quantity: 1,
        }},
      ],
      client_reference_id: userId,
      metadata: {{ tier }},
      success_url: successUrl,
      cancel_url: cancelUrl,
    }});

    return {{ id: session.id, url: session.url }};
  }} catch (err) {{
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    console.error({BT}[StripeService] createCheckoutSession error: ${{message}}{BT});
    throw new Error({BT}Stripe checkout error: ${{message}}{BT});
  }}
}}

// --------------- Billing Portal Sessions ---------------

export interface PortalSessionResult {{
  id: string;
  url: string;
}}

export async function createPortalSession(
  customerId: string,
): Promise<PortalSessionResult> {{
  try {{
    const session = await stripe.billingPortal.sessions.create({{
      customer: customerId,
      return_url:
        process.env.BILLING_RETURN_URL ?? "https://animaforge.app/billing",
    }});

    return {{ id: session.id, url: session.url }};
  }} catch (err) {{
    const message = err instanceof Error ? err.message : "Stripe portal failed";
    console.error({BT}[StripeService] createPortalSession error: ${{message}}{BT});
    throw new Error({BT}Stripe portal error: ${{message}}{BT});
  }}
}}

// --------------- Webhook Event Processing ---------------

export interface WebhookResult {{
  received: boolean;
  action?: string;
  error?: string;
}}

/**
 * Verify and construct a Stripe webhook event from the raw request body
 * and signature header, then process it.
 */
export async function handleWebhookEvent(
  body: string | Buffer,
  signature: string,
): Promise<WebhookResult> {{
  let event: Stripe.Event;

  try {{
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  }} catch (err) {{
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error({BT}[StripeService] Webhook signature error: ${{message}}{BT});
    return {{ received: false, error: {BT}Webhook signature verification failed: ${{message}}{BT} }};
  }}

  try {{
    switch (event.type) {{
      case "checkout.session.completed": {{
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {{
          return {{ received: true, error: "Missing userId or tier in session" }};
        }}

        await billingService.subscribeTier(userId, tier as any);
        return {{ received: true, action: "subscription_created" }};
      }}

      case "customer.subscription.updated": {{
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const newTier = subscription.metadata?.tier;

        if (userId && newTier) {{
          await billingService.changeTier(userId, newTier as any);
          return {{ received: true, action: "subscription_updated" }};
        }}

        return {{ received: true, action: "subscription_update_acknowledged" }};
      }}

      case "customer.subscription.deleted": {{
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {{
          await billingService.cancelSubscription(userId);
          return {{ received: true, action: "subscription_canceled" }};
        }}

        return {{ received: true, error: "Missing userId in subscription metadata" }};
      }}

      case "invoice.payment_succeeded": {{
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const userId = invoice.subscription_details?.metadata?.userId;
        const tier = invoice.subscription_details?.metadata?.tier;

        if (userId && tier) {{
          const plan = PRICING[tier];
          if (plan) {{
            await billingService.topUp(userId, plan.credits);
          }}
        }}

        console.log(
          {BT}[StripeService] Payment succeeded for customer=${{customerId}}{BT},
        );
        return {{ received: true, action: "payment_recorded" }};
      }}

      case "invoice.payment_failed": {{
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          {BT}[StripeService] Payment failed for invoice=${{invoice.id}}{BT},
        );
        return {{ received: true, action: "payment_failed_recorded" }};
      }}

      default:
        return {{ received: true, action: "unhandled_event" }};
    }}
  }} catch (err) {{
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error({BT}[StripeService] Webhook processing error: ${{message}}{BT});
    return {{ received: true, error: message }};
  }}
}}

// --------------- Helpers ---------------

export function getStripePriceId(tier: string): string | undefined {{
  return STRIPE_PRICE_IDS[tier];
}}

export function getPlan(tier: string): PlanConfig | undefined {{
  return PRICING[tier];
}}

// --------------- In-memory fallback helpers (for tests / no-Stripe mode) ---------------

const customers = new Map<string, {{ id: string; userId: string; email: string }}>();
const customersByUserId = new Map<string, string>();

export function createCustomer(
  userId: string,
  email: string,
): {{ id: string; userId: string; email: string }} {{
  const existing = customersByUserId.get(userId);
  if (existing) {{
    return customers.get(existing)!;
  }}

  const customer = {{
    id: {BT}cus_${{uuidv4().replace(/-/g, "").slice(0, 14)}}{BT},
    userId,
    email,
  }};

  customers.set(customer.id, customer);
  customersByUserId.set(userId, customer.id);
  return customer;
}}

export function getCustomerByUserId(
  userId: string,
): {{ id: string; userId: string; email: string }} | undefined {{
  const customerId = customersByUserId.get(userId);
  return customerId ? customers.get(customerId) : undefined;
}}

export function _resetStores(): void {{
  customers.clear();
  customersByUserId.clear();
  billingService._resetStores();
}}
''')


# ===== creditGuard.ts =====
w("middleware/creditGuard.ts", f'''import {{ Request, Response, NextFunction }} from "express";
import * as billingService from "../services/billingService";
import type {{ JobType, SubscriptionTier }} from "../models/billingSchemas";

/**
 * Middleware factory that checks whether the user has enough credits
 * for the requested job type before allowing the request to proceed.
 *
 * Expects {BT}req.body.userId{BT}, {BT}req.body.jobType{BT}, and {BT}req.body.tier{BT}
 * to be present on the request (or override via parameters).
 *
 * Returns 402 Payment Required if the user has insufficient credits.
 */
export function checkCredits(jobType?: JobType, tier?: SubscriptionTier) {{
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {{
    const resolvedJobType = jobType ?? (req.body.jobType as JobType);
    const resolvedTier = tier ?? (req.body.tier as SubscriptionTier);
    const userId = req.body.userId as string;

    if (!userId) {{
      res.status(400).json({{ error: "userId is required" }});
      return;
    }}

    if (!resolvedJobType) {{
      res.status(400).json({{ error: "jobType is required" }});
      return;
    }}

    if (!resolvedTier) {{
      res.status(400).json({{ error: "tier is required" }});
      return;
    }}

    const cost = billingService.getCreditCost(resolvedJobType);
    if (cost === undefined) {{
      res.status(400).json({{ error: {BT}Unknown job type: ${{resolvedJobType}}{BT} }});
      return;
    }}

    try {{
      const balance = await billingService.getBalance(userId);

      if (balance.balance < cost) {{
        res.status(402).json({{
          error: "Insufficient credits",
          required: cost,
          available: balance.balance,
          jobType: resolvedJobType,
          tier: resolvedTier,
        }});
        return;
      }}

      next();
    }} catch (err) {{
      const message = err instanceof Error ? err.message : "Credit check failed";
      res.status(500).json({{ error: message }});
    }}
  }};
}}
''')

print("ALL FILES WRITTEN")
