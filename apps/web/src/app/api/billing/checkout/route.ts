import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/billing/checkout',
  'it requires Stripe credentials (STRIPE_SECRET_KEY), which are not configured',
);

export const POST = handler;
