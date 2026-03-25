import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import * as billingService from "./billingService";

// --------------- Stripe Client ---------------

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// --------------- Pricing / Price ID Configuration ---------------

export interface PlanConfig {
  tier: string;
  name: string;
  stripePriceId: string;
  priceMonthly: number;
  credits: number;
}

/** Map tiers to Stripe price IDs (set via env or defaults for dev) */
const STRIPE_PRICE_IDS: Record<string, string> = {
  free: process.env.STRIPE_PRICE_FREE ?? "price_free_000",
  creator: process.env.STRIPE_PRICE_CREATOR ?? "price_creator_029",
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro_049",
  studio: process.env.STRIPE_PRICE_STUDIO ?? "price_studio_099",
};

export const PRICING: Record<string, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    stripePriceId: STRIPE_PRICE_IDS.free,
    priceMonthly: 0,
    credits: 10,
  },
  creator: {
    tier: "creator",
    name: "Creator",
    stripePriceId: STRIPE_PRICE_IDS.creator,
    priceMonthly: 2900,
    credits: 100,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    stripePriceId: STRIPE_PRICE_IDS.pro,
    priceMonthly: 4900,
    credits: 300,
  },
  studio: {
    tier: "studio",
    name: "Studio",
    stripePriceId: STRIPE_PRICE_IDS.studio,
    priceMonthly: 9900,
    credits: 1000,
  },
};

// --------------- Checkout Sessions ---------------

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
}

export async function createCheckoutSession(
  userId: string,
  tier: string,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutSessionResult> {
  const plan = PRICING[tier];
  if (!plan) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: { tier },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { id: session.id, url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    console.error(`[StripeService] createCheckoutSession error: ${message}`);
    throw new Error(`Stripe checkout error: ${message}`);
  }
}

// --------------- Billing Portal Sessions ---------------

export interface PortalSessionResult {
  id: string;
  url: string;
}

export async function createPortalSession(
  customerId: string,
): Promise<PortalSessionResult> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url:
        process.env.BILLING_RETURN_URL ?? "https://animaforge.app/billing",
    });

    return { id: session.id, url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe portal failed";
    console.error(`[StripeService] createPortalSession error: ${message}`);
    throw new Error(`Stripe portal error: ${message}`);
  }
}

// --------------- Webhook Event Processing ---------------

export interface WebhookResult {
  received: boolean;
  action?: string;
  error?: string;
}

/**
 * Verify and construct a Stripe webhook event from the raw request body
 * and signature header, then process it.
 */
export async function handleWebhookEvent(
  body: string | Buffer,
  signature: string,
): Promise<WebhookResult> {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error(`[StripeService] Webhook signature error: ${message}`);
    return { received: false, error: `Webhook signature verification failed: ${message}` };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          return { received: true, error: "Missing userId or tier in session" };
        }

        await billingService.subscribeTier(userId, tier as any);
        return { received: true, action: "subscription_created" };
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const newTier = subscription.metadata?.tier;

        if (userId && newTier) {
          await billingService.changeTier(userId, newTier as any);
          return { received: true, action: "subscription_updated" };
        }

        return { received: true, action: "subscription_update_acknowledged" };
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await billingService.cancelSubscription(userId);
          return { received: true, action: "subscription_canceled" };
        }

        return { received: true, error: "Missing userId in subscription metadata" };
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const userId = invoice.subscription_details?.metadata?.userId;
        const tier = invoice.subscription_details?.metadata?.tier;

        if (userId && tier) {
          const plan = PRICING[tier];
          if (plan) {
            await billingService.topUp(userId, plan.credits);
          }
        }

        console.log(
          `[StripeService] Payment succeeded for customer=${customerId}`,
        );
        return { received: true, action: "payment_recorded" };
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `[StripeService] Payment failed for invoice=${invoice.id}`,
        );
        return { received: true, action: "payment_failed_recorded" };
      }

      default:
        return { received: true, action: "unhandled_event" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[StripeService] Webhook processing error: ${message}`);
    return { received: true, error: message };
  }
}

// --------------- Helpers ---------------

export function getStripePriceId(tier: string): string | undefined {
  return STRIPE_PRICE_IDS[tier];
}

export function getPlan(tier: string): PlanConfig | undefined {
  return PRICING[tier];
}

// --------------- In-memory fallback helpers (for tests / no-Stripe mode) ---------------

const customers = new Map<string, { id: string; userId: string; email: string }>();
const customersByUserId = new Map<string, string>();

export function createCustomer(
  userId: string,
  email: string,
): { id: string; userId: string; email: string } {
  const existing = customersByUserId.get(userId);
  if (existing) {
    return customers.get(existing)!;
  }

  const customer = {
    id: `cus_${uuidv4().replace(/-/g, "").slice(0, 14)}`,
    userId,
    email,
  };

  customers.set(customer.id, customer);
  customersByUserId.set(userId, customer.id);
  return customer;
}

export function getCustomerByUserId(
  userId: string,
): { id: string; userId: string; email: string } | undefined {
  const customerId = customersByUserId.get(userId);
  return customerId ? customers.get(customerId) : undefined;
}

export function _resetStores(): void {
  customers.clear();
  customersByUserId.clear();
  billingService._resetStores();
}
