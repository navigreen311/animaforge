import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as cdnService from "../services/cdnService.js";

const router = Router();

// POST /api/v1/cdn/distributions
router.post("/cdn/distributions", requireAuth, (req: Request, res: Response) => {
  const { projectId } = req.body;
  if (!projectId) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "projectId is required" },
    });
    return;
  }

  try {
    const dist = cdnService.createDistribution(projectId);
    res.status(201).json({ success: true, data: dist });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// POST /api/v1/cdn/invalidate
router.post("/cdn/invalidate", requireAuth, (req: Request, res: Response) => {
  const { distributionId, paths } = req.body;
  if (!distributionId || !paths || !Array.isArray(paths)) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "distributionId and paths[] are required" },
    });
    return;
  }

  try {
    const result = cdnService.invalidateCache(distributionId, paths);
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/cdn/url/:assetKey
router.get("/cdn/url/:assetKey", requireAuth, (req: Request, res: Response) => {
  const quality = req.query.quality as string | undefined;
  const signed = req.query.signed === "true";
  const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string, 10) : undefined;

  const url = cdnService.getDeliveryUrl(req.params.assetKey, { quality, signed, expiresIn });
  res.status(200).json({ success: true, data: { url } });
});

// POST /api/v1/cdn/adaptive/:assetId
router.post("/cdn/adaptive/:assetId", requireAuth, (req: Request, res: Response) => {
  const config = cdnService.configureAdaptiveBitrate(req.params.assetId);
  res.status(201).json({ success: true, data: config });
});

// GET /api/v1/cdn/metrics/:distributionId
router.get("/cdn/metrics/:distributionId", requireAuth, (req: Request, res: Response) => {
  const m = cdnService.getDeliveryMetrics(req.params.distributionId);
  if (!m) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Distribution not found" },
    });
    return;
  }
  res.status(200).json({ success: true, data: m });
});

// DELETE /api/v1/cdn/purge/:assetKey
router.delete("/cdn/purge/:assetKey", requireAuth, (req: Request, res: Response) => {
  const result = cdnService.purgeAsset(req.params.assetKey);
  res.status(200).json({ success: true, data: result });
});

// GET /api/v1/cdn/locations
router.get("/cdn/locations", (req: Request, res: Response) => {
  const locations = cdnService.getEdgeLocations();
  res.status(200).json({ success: true, data: { count: locations.length, locations } });
});

export default router;
