import { Router } from "express";
import type { Request, Response } from "express";
import * as verifyService from "../services/verifyService.js";

const router = Router();

// GET /api/v1/verify/:outputId — NO AUTH REQUIRED
router.get("/verify/:outputId", (req: Request, res: Response) => {
  try {
    const result = verifyService.verifyOutput(req.params.outputId);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/verify/:outputId/badge — NO AUTH REQUIRED
router.get("/verify/:outputId/badge", (req: Request, res: Response) => {
  try {
    const badge = verifyService.generateVerificationBadge(req.params.outputId);
    res.status(200).json({ success: true, data: badge });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/verify/:outputId/manifest — NO AUTH REQUIRED
router.get("/verify/:outputId/manifest", (req: Request, res: Response) => {
  try {
    const result = verifyService.verifyOutput(req.params.outputId);
    res.status(200).json({ success: true, data: result.manifest });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

export default router;
