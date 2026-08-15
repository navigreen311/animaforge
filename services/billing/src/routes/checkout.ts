import { Router, Request, Response } from "express";
import * as stripeService from "../services/stripeService";
import { PRICING } from "../services/stripeService";

const router = Router();

// POST /billing/checkout — Create a Stripe Checkout session
router.post("/checkout", (req: Request, res: Response) => {
  const { tier, successUrl, cancelUrl } = req.body;

  if (!tier || typeof tier !== "string") {
    res.status(400).json({ error: "tier is required" });
    return;
  }

  if (!PRICING[tier]) {
    res.status(400).json({ error: `Invalid tier: ${tier}. Valid tiers: ${Object.keys(PRICING).join(", ")}` });
    return;
  }

  // In production, userId would come from auth middleware (req.user)
  const userId = req.body.userId || "anonymous";

  try {
    const session = stripeService.createCheckoutSession(
      userId,
      tier,
      successUrl,
      cancelUrl,
    );
    res.status(201).json(session);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /billing/portal — Create a billing portal session
router.post("/portal", (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  // stripeService has no getCustomerByUserId, and nothing in this service
  // persists a userId -> Stripe customer mapping. The route was calling a
  // function that was never written, so it has never compiled or run.
  //
  // 501 rather than 404: a 404 would say "this user has no billing customer",
  // which implies the lookup happened and came back empty. It cannot happen at
  // all. Returning the honest status keeps the caller from retrying.
  res.status(501).json({
    error: "not_implemented",
    message:
      "Opening the billing portal needs a stored Stripe customer id for the " +
      "user. This service does not persist that mapping, so no portal session " +
      "can be created.",
    userId,
    missing: ["userId -> stripe customer mapping", "STRIPE_SECRET_KEY"],
  });
});

// GET /billing/plans — List available plans with pricing
router.get("/plans", (_req: Request, res: Response) => {
  const plans = Object.values(PRICING).map((plan) => ({
    tier: plan.tier,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    priceDisplay: `$${(plan.priceMonthly / 100).toFixed(0)}/mo`,
    credits: plan.credits,
    priceId: plan.stripePriceId,
  }));

  res.json({ plans });
});

export default router;
