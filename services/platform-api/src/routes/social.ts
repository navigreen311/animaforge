import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as socialService from "../services/socialService.js";
import * as socialPublisher from "../services/socialPublisher.js";

const router = Router();

// POST /api/v1/social/connect
router.post("/social/connect", requireAuth, (req: Request, res: Response) => {
  const { platform, credentials } = req.body;
  if (!platform || !credentials) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "platform and credentials are required" },
    });
    return;
  }

  try {
    const connection = socialService.connectPlatform(req.user!.id, platform, credentials);
    res.status(201).json({ success: true, data: connection });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// DELETE /api/v1/social/disconnect
router.delete("/social/disconnect", requireAuth, (req: Request, res: Response) => {
  const { platform } = req.body;
  if (!platform) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "platform is required" },
    });
    return;
  }

  const removed = socialService.disconnectPlatform(req.user!.id, platform);
  if (!removed) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Platform connection not found" },
    });
    return;
  }
  res.status(200).json({ success: true, data: { disconnected: true } });
});

// GET /api/v1/social/connections
router.get("/social/connections", requireAuth, (req: Request, res: Response) => {
  const connections = socialService.getConnections(req.user!.id);
  res.status(200).json({ success: true, data: connections });
});

// POST /api/v1/social/publish
router.post("/social/publish", requireAuth, (req: Request, res: Response) => {
  const { platform, videoUrl, metadata } = req.body;
  if (!platform || !videoUrl) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "platform and videoUrl are required" },
    });
    return;
  }

  try {
    const publication = socialService.publishToPlatform(
      req.user!.id,
      platform,
      videoUrl,
      metadata ?? {},
    );
    res.status(201).json({ success: true, data: publication });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// POST /api/v1/social/schedule
router.post("/social/schedule", requireAuth, (req: Request, res: Response) => {
  const { publications } = req.body;
  if (!publications || !Array.isArray(publications) || publications.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "publications array is required" },
    });
    return;
  }

  try {
    const scheduled = socialService.schedulePublication(req.user!.id, publications);
    res.status(201).json({ success: true, data: scheduled });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/social/history
router.get("/social/history", requireAuth, (req: Request, res: Response) => {
  const history = socialService.getPublicationHistory(req.user!.id);
  res.status(200).json({ success: true, data: history });
});

// POST /api/v1/social/publish-with-brand
router.post("/social/publish-with-brand", requireAuth, async (req: Request, res: Response) => {
  const { platform, videoUrl, brandKitId } = req.body;
  if (!platform || !videoUrl || !brandKitId) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "platform, videoUrl, and brandKitId are required" },
    });
    return;
  }

  try {
    const result = await socialPublisher.publishWithBrand(req.user!.id, platform, videoUrl, brandKitId);
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// POST /api/v1/social/schedule-multi
router.post("/social/schedule-multi", requireAuth, async (req: Request, res: Response) => {
  const { videoUrl, platforms, scheduleAt, brandKitId } = req.body;
  if (!videoUrl || !platforms || !Array.isArray(platforms) || platforms.length === 0 || !scheduleAt) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "videoUrl, platforms[], and scheduleAt are required" },
    });
    return;
  }

  try {
    const result = await socialPublisher.scheduleMultiPlatform(
      req.user!.id,
      videoUrl,
      platforms,
      scheduleAt,
      brandKitId,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// GET /api/v1/social/calendar
router.get("/social/calendar", requireAuth, (req: Request, res: Response) => {
  const month = req.query.month as string;
  if (!month) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "month query parameter is required (e.g. 2026-03)" },
    });
    return;
  }

  const calendar = socialPublisher.getPublishingCalendar(req.user!.id, month);
  res.status(200).json({ success: true, data: calendar });
});

// GET /api/v1/social/performance/:publishId
router.get("/social/performance/:publishId", requireAuth, (req: Request, res: Response) => {
  const metrics = socialPublisher.getPerformanceMetrics(req.user!.id, req.params.publishId);
  if (!metrics) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Publication not found" },
    });
    return;
  }
  res.status(200).json({ success: true, data: metrics });
});

// GET /api/v1/social/cross-platform-report
router.get("/social/cross-platform-report", requireAuth, (req: Request, res: Response) => {
  const period = req.query.period as string;
  if (!period) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "period query parameter is required (e.g. 2026-03)" },
    });
    return;
  }

  const report = socialPublisher.getCrossplatformReport(req.user!.id, period);
  res.status(200).json({ success: true, data: report });
});

// GET /api/v1/social/platforms
router.get("/social/platforms", requireAuth, (_req: Request, res: Response) => {
  const platforms = socialPublisher.getSupportedPlatforms();
  res.status(200).json({ success: true, data: platforms });
});

export default router;
