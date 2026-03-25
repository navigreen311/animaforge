import { Request, Response, NextFunction } from 'express';
import { constructWebhookEvent } from '../services/stripeService';

export async function stripeWebhookMiddleware(req: Request, res: Response, next: NextFunction) {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    const event = await constructWebhookEvent(req.body, sig);

    if (!event) {
      console.warn('[StripeWebhook] Stripe not configured, skipping webhook verification');
      return res.json({ received: true });
    }

    (req as any).stripeEvent = event;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed';
    console.error(`[StripeWebhook] Verification error: ${message}`);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
}
