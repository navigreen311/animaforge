import { v4 as uuidv4 } from "uuid";
import * as billingService from "./billingService";

// --------------- Pricing Configuration ---------------

export interface PlanConfig {
  tier: string;
  name: string;
  priceId: string;
  priceMonthly: number;
  credits: number;
}

export const PRICING: Record<string, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    priceId: "price_free_000",
    priceMonthly: 0,
    credits: 10,
  },
  creator: {
    tier: "creator",
    name: "Creator",
    priceId: "price_creator_029",
    priceMonthly: 2900, // cents
    credits: 100,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceId: "price_pro_049",
    priceMonthly: 4900,
    credits: 300,
  },
  studio: {
    tier: "studio",
    name: "Studio",
    priceId: "price_studio_099",
    priceMonthly: 9900,
    credits: 1000,
  },
};

// --------------- In-memory Stripe mock stores ---------------

export interface StripeCustomer {
  id: string;
  userId: string;
  email: string;
  createdAt: string;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  tier: string;
  priceId: string;
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

const customers = new Map<string, StripeCustomer>();
const customersByUserId = new Map<string, string>(); // userId -> customerId
const subscriptions = new Map<string, StripeSubscription>();
const subscriptionsByCustomer = new Map<string, string>(); // customerId -> subscriptionId

// --------------- Customer ---------------

export function createCustomer(userId: string, email: string): StripeCustomer {
  const existing = customersByUserId.get(userId);
  if (existing) {
    return customers.get(existing)!;
  }

  const customer: StripeCustomer = {
    id: `cus_${uuidv4().replace(/-/g, "").slice(0, 14)}`,
    userId,
    email,
    createdAt: new Date().toISOString(),
  };

  customers.set(customer.id, customer);
  customersByUserId.set(userId, customer.id);
  return customer;
}

// --------------- Subscription ---------------

export function createSubscription(
  customerId: string,
  tier: string,
): StripeSubscription {
  const plan = PRICING[tier];
  if (!plan) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const customer = customers.get(customerId);
  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: StripeSubscription = {
    id: `sub_${uuidv4().replace(/-/g, "").slice(0, 14)}`,
    customerId,
    tier,
    priceId: plan.priceId,
    status: "active",
    currentPeriodEnd: periodEnd.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  subscriptions.set(sub.id, sub);
  subscriptionsByCustomer.set(customerId, sub.id);

  // Allocate credits for the tier
  const userId = customer.userId;
  billingService.topUp(userId, plan.credits);

  return sub;
}

export function updateSubscription(
  subscriptionId: string,
  newTier: string,
): StripeSubscription {
  const sub = subscriptions.get(subscriptionId);
  if (!sub) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const plan = PRICING[newTier];
  if (!plan) {
    throw new Error(`Unknown tier: ${newTier}`);
  }

  sub.tier = newTier;
  sub.priceId = plan.priceId;
  sub.updatedAt = new Date().toISOString();
  subscriptions.set(subscriptionId, sub);

  return sub;
}

export function cancelSubscription(
  subscriptionId: string,
): StripeSubscription {
  const sub = subscriptions.get(subscriptionId);
  if (!sub) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  sub.status = "canceled";
  sub.updatedAt = new Date().toISOString();
  subscriptions.set(subscriptionId, sub);

  return sub;
}

// --------------- Checkout & Portal Sessions ---------------

export interface CheckoutSession {
  id: string;
  url: string;
  userId: string;
  tier: string;
  priceId: string;
  status: "open";
}

export function createCheckoutSession(
  userId: string,
  tier: string,
  successUrl?: string,
  cancelUrl?: string,
): CheckoutSession {
  const plan = PRICING[tier];
  if (!plan) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const sessionId = `cs_${uuidv4().replace(/-/g, "").slice(0, 14)}`;
  const baseUrl = "https://checkout.stripe.com";
  const success = successUrl || "https://animaforge.app/billing/success";
  const cancel = cancelUrl || "https://animaforge.app/billing/cancel";

  return {
    id: sessionId,
    url: `${baseUrl}/c/pay/${sessionId}?success_url=${encodeURIComponent(success)}&cancel_url=${encodeURIComponent(cancel)}`,
    userId,
    tier,
    priceId: plan.priceId,
    status: "open",
  };
}

export interface PortalSession {
  id: string;
  url: string;
  customerId: string;
}

export function createPortalSession(customerId: string): PortalSession {
  const customer = customers.get(customerId);
  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  const sessionId = `bps_${uuidv4().replace(/-/g, "").slice(0, 14)}`;
  return {
    id: sessionId,
    url: `https://billing.stripe.com/p/session/${sessionId}`,
    customerId,
  };
}

// --------------- Webhook Event Processing ---------------

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface WebhookResult {
  received: boolean;
  action?: string;
  error?: string;
}

export function handleWebhookEvent(event: WebhookEvent): WebhookResult {
  switch (event.type) {
    case "checkout.session.completed": {
      const obj = event.data.object;
      const userId = obj.client_reference_id as string | undefined;
      const tier = (obj.metadata as Record<string, string>)?.tier;

      if (!userId || !tier) {
        return { received: true, error: "Missing userId or tier in session" };
      }

      // Create customer and subscription on successful checkout
      const email = (obj.customer_email as string) || `${userId}@animaforge.app`;
      const customer = createCustomer(userId, email);
      createSubscription(customer.id, tier);

      return { received: true, action: "subscription_created" };
    }

    case "customer.subscription.updated": {
      const obj = event.data.object;
      const subscriptionId = obj.id as string;
      const newTier = (obj.metadata as Record<string, string>)?.tier;

      if (!subscriptionId) {
        return { received: true, error: "Missing subscription id" };
      }

      if (newTier) {
        try {
          updateSubscription(subscriptionId, newTier);
          return { received: true, action: "subscription_updated" };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return { received: true, error: message };
        }
      }

      return { received: true, action: "subscription_update_acknowledged" };
    }

    case "customer.subscription.deleted": {
      const obj = event.data.object;
      const subscriptionId = obj.id as string;

      if (!subscriptionId) {
        return { received: true, error: "Missing subscription id" };
      }

      try {
        cancelSubscription(subscriptionId);
        return { received: true, action: "subscription_canceled" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { received: true, error: message };
      }
    }

    case "invoice.payment_succeeded": {
      const obj = event.data.object;
      const customerId = obj.customer as string;

      if (!customerId) {
        return { received: true, error: "Missing customer id" };
      }

      // Look up the subscription to credit the customer
      const subId = subscriptionsByCustomer.get(customerId);
      if (subId) {
        const sub = subscriptions.get(subId);
        if (sub) {
          const plan = PRICING[sub.tier];
          const customer = customers.get(customerId);
          if (plan && customer) {
            billingService.topUp(customer.userId, plan.credits);
          }
        }
      }

      return { received: true, action: "payment_recorded" };
    }

    case "invoice.payment_failed": {
      const obj = event.data.object;
      const subscriptionId = obj.subscription as string;

      if (subscriptionId) {
        const sub = subscriptions.get(subscriptionId);
        if (sub) {
          sub.status = "past_due";
          sub.updatedAt = new Date().toISOString();
          subscriptions.set(subscriptionId, sub);
        }
      }

      return { received: true, action: "payment_failed_recorded" };
    }

    default:
      return { received: true, action: "unhandled_event" };
  }
}

// --------------- Helpers ---------------

export function getCustomerByUserId(userId: string): StripeCustomer | undefined {
  const customerId = customersByUserId.get(userId);
  return customerId ? customers.get(customerId) : undefined;
}

export function getSubscriptionByCustomer(
  customerId: string,
): StripeSubscription | undefined {
  const subId = subscriptionsByCustomer.get(customerId);
  return subId ? subscriptions.get(subId) : undefined;
}

export function _resetStores(): void {
  customers.clear();
  customersByUserId.clear();
  subscriptions.clear();
  subscriptionsByCustomer.clear();
  billingService._resetStores();
}
