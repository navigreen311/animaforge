import { Request, Response, NextFunction } from "express";

/**
 * Stripe webhook signature verification middleware.
 *
 * In production, this would use:
 *   stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
 *
 * This mock middleware verifies that a stripe-signature header is present
 * and simulates the verification flow.
 */

const MOCK_WEBHOOK_SECRET = "whsec_test_animaforge_mock_secret";

export interface StripeWebhookRequest extends Request {
  stripeEvent?: {
    id: string;
    type: string;
    data: {
      object: Record<string, unknown>;
    };
  };
}

export function stripeWebhookMiddleware(
  req: StripeWebhookRequest,
  res: Response,
  next: NextFunction,
): void {
  const signature = req.headers["stripe-signature"] as string | undefined;

  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  // In production: stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
  // Mock verification: accept any signature that starts with "t=" (Stripe format)
  // Real Stripe signatures look like: t=timestamp,v1=hash
  if (!signature.startsWith("t=")) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    // Parse the event from the request body
    const event = req.body;

    if (!event || !event.type || !event.data) {
      res.status(400).json({ error: "Invalid event payload" });
      return;
    }

    // Attach parsed event to request for downstream handlers
    req.stripeEvent = {
      id: event.id || `evt_mock_${Date.now()}`,
      type: event.type,
      data: event.data,
    };

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    res.status(400).json({ error: message });
  }
}

export { MOCK_WEBHOOK_SECRET };
