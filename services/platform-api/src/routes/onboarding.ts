import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as onboardingService from "../services/onboardingService.js";

const router = Router();

// POST /api/v1/onboarding/start
router.post("/onboarding/start", requireAuth, (req: Request, res: Response) => {
  try {
    const result = onboardingService.startOnboarding(req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// PUT /api/v1/onboarding/step/:stepId
router.put("/onboarding/step/:stepId", requireAuth, (req: Request, res: Response) => {
  try {
    const result = onboardingService.completeStep(req.user!.id, req.params.stepId);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/onboarding/progress
router.get("/onboarding/progress", requireAuth, (req: Request, res: Response) => {
  const progress = onboardingService.getProgress(req.user!.id);
  res.status(200).json({ success: true, data: progress });
});

// POST /api/v1/onboarding/skip
router.post("/onboarding/skip", requireAuth, (req: Request, res: Response) => {
  try {
    const result = onboardingService.skipOnboarding(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

export default router;
