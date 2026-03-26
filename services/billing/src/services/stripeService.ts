import Stripe from 'stripe';

// --------------- Stripe Client (lazy, with mock fallback) ---------------

let stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('YOUR_')) {
    console.warn('[StripeService] Stripe not configured, using mock mode');
    return null;
  }
  stripe = new Stripe(key, { apiVersion: '2024-04-10' });
  return stripe;
}

// --------------- Pricing / Price ID Configuration ---------------

export interface PlanConfig {
  tier: string;
  name: string;
  stripePriceId: string;
  priceMonthly: number;
  credits: number;
}

const PRICE_IDS: Record<string, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR || 'price_creator_placeholder',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  studio: process.env.STRIPE_PRICE_STUDIO || 'price_studio_placeholder',
};

export const PRICING: Record<string, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    stripePriceId: '',
    priceMonthly: 0,
    credits: 10,
  },
  creator: {
    tier: 'creator',
    name: 'Creator',
    stripePriceId: PRICE_IDS.creator,
    priceMonthly: 2900,
    credits: 100,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    stripePriceId: PRICE_IDS.pro,
    priceMonthly: 4900,
    credits: 300,
  },
  studio: {
    tier: 'studio',
    name: 'Studio',
    stripePriceId: PRICE_IDS.studio,
    priceMonthly: 9900,
    credits: 1000,
  },
};

// --------------- Customer Management ---------------

export async function createCustomer(email: string, name?: string) {
  const s = getStripe();
  if (!s) return { id: `mock_cus_${Date.now()}`, email, name };
  return s.customers.create({ email, name });
}

// --------------- Checkout Sessions ---------------

export async function createCheckoutSession(
  customerId: string,
  tier: string,
  successUrl: string,
  cancelUrl: string,
) {
  const s = getStripe();
  if (!s) return { id: `mock_cs_${Date.now()}`, url: successUrl + '?session_id=mock' };
  return s.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: cancelUrl,
  });
}

// --------------- Billing Portal Sessions ---------------

export async function createPortalSession(customerId: string, returnUrl: string) {
  const s = getStripe();
  if (!s) return { url: returnUrl + '?portal=mock' };
  return s.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

// --------------- Subscription Management ---------------

export async function cancelSubscription(subscriptionId: string) {
  const s = getStripe();
  if (!s) return { id: subscriptionId, status: 'canceled' };
  return s.subscriptions.cancel(subscriptionId);
}

export async function getSubscription(subscriptionId: string) {
  const s = getStripe();
  if (!s) return { id: subscriptionId, status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 };
  return s.subscriptions.retrieve(subscriptionId);
}

export async function updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams) {
  const s = getStripe();
  if (!s) return { id: subscriptionId, status: 'active', ...params };
  return s.subscriptions.update(subscriptionId, params);
}

// --------------- Invoices ---------------

export async function listInvoices(customerId: string, limit = 10) {
  const s = getStripe();
  if (!s) return { data: [], has_more: false };
  return s.invoices.list({ customer: customerId, limit });
}

// --------------- Webhook Event Construction ---------------

export async function constructWebhookEvent(body: string | Buffer, signature: string) {
  const s = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return null;
  return s.webhooks.constructEvent(body, signature, secret);
}

// --------------- Helpers ---------------

export function getStripePriceId(tier: string): string | undefined {
  return PRICE_IDS[tier];
}

export function getPlan(tier: string): PlanConfig | undefined {
  return PRICING[tier];
}
