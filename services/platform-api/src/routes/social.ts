import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as socialService from "../services/socialService.js";

const router = Router();

// POST /api/v1/social/connect — connect a platform
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

// DELETE /api/v1/social/disconnect — disconnect a platform
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

// GET /api/v1/social/connections — list connected platforms
router.get("/social/connections", requireAuth, (req: Request, res: Response) => {
  const connections = socialService.getConnections(req.user!.id);
  res.status(200).json({ success: true, data: connections });
});

// POST /api/v1/social/publish — publish to platform(s)
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

// POST /api/v1/social/schedule — schedule publication
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

// GET /api/v1/social/history — publication history
router.get("/social/history", requireAuth, (req: Request, res: Response) => {
  const history = socialService.getPublicationHistory(req.user!.id);
  res.status(200).json({ success: true, data: history });
});

export default router;
