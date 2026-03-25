import { Request, Response, NextFunction } from "express";
import * as billingService from "../services/billingService";
import type { JobType, SubscriptionTier } from "../models/billingSchemas";

/**
 * Middleware factory that checks whether the user has enough credits
 * for the requested job type before allowing the request to proceed.
 *
 * Expects `req.body.userId`, `req.body.jobType`, and `req.body.tier`
 * to be present on the request (or override via parameters).
 *
 * Returns 402 Payment Required if the user has insufficient credits.
 */
export function checkCredits(jobType?: JobType, tier?: SubscriptionTier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const resolvedJobType = jobType ?? (req.body.jobType as JobType);
    const resolvedTier = tier ?? (req.body.tier as SubscriptionTier);
    const userId = req.body.userId as string;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (!resolvedJobType) {
      res.status(400).json({ error: "jobType is required" });
      return;
    }

    if (!resolvedTier) {
      res.status(400).json({ error: "tier is required" });
      return;
    }

    const cost = billingService.getCreditCost(resolvedJobType);
    if (cost === undefined) {
      res.status(400).json({ error: `Unknown job type: ${resolvedJobType}` });
      return;
    }

    try {
      const balance = await billingService.getBalance(userId);

      if (balance.balance < cost) {
        res.status(402).json({
          error: "Insufficient credits",
          required: cost,
          available: balance.balance,
          jobType: resolvedJobType,
          tier: resolvedTier,
        });
        return;
      }

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Credit check failed";
      res.status(500).json({ error: message });
    }
  };
}
