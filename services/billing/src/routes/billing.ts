import { Router, Request, Response } from "express";
import {
  SubscribeSchema,
  UpdateSubscriptionSchema,
  TopUpSchema,
  DeductCreditsSchema,
  StripeWebhookSchema,
} from "../models/billingSchemas";
import * as billingService from "../services/billingService";

const router = Router();

// POST /billing/subscribe
router.post("/subscribe", (req: Request, res: Response) => {
  const parsed = SubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const sub = billingService.subscribe(parsed.data.userId, parsed.data.tier);
    res.status(201).json(sub);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(409).json({ error: message });
  }
});

// GET /billing/subscription/:userId
router.get("/subscription/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const sub = billingService.getSubscription(userId);
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  res.json(sub);
});

// PUT /billing/subscription/:userId
router.put("/subscription/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const parsed = UpdateSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const sub = billingService.updateSubscription(userId, parsed.data.tier);
    res.json(sub);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

// DELETE /billing/subscription/:userId
router.delete("/subscription/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  try {
    const sub = billingService.cancelSubscription(userId);
    res.json(sub);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

// POST /billing/credits/topup
router.post("/credits/topup", (req: Request, res: Response) => {
  const parsed = TopUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const bal = billingService.topUp(parsed.data.userId, parsed.data.amount);
  res.json(bal);
});

// GET /billing/credits/:userId
router.get("/credits/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const bal = billingService.getCredits(userId);
  res.json(bal);
});

// POST /billing/credits/deduct
router.post("/credits/deduct", (req: Request, res: Response) => {
  const parsed = DeductCreditsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const bal = billingService.deductCredits(
      parsed.data.userId,
      parsed.data.jobType,
      parsed.data.tier,
    );
    res.json(bal);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(402).json({ error: message });
  }
});

// POST /billing/webhook
router.post("/webhook", (req: Request, res: Response) => {
  const parsed = StripeWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = billingService.handleStripeWebhook(
    parsed.data.type,
    parsed.data.data as Record<string, unknown> | undefined,
  );
  res.json(result);
});

export default router;
