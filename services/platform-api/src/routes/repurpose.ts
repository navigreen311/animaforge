import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as repurposeService from "../services/repurposeService.js";

const router = Router();

// POST /api/v1/repurpose/platform — repurpose for specific platform
router.post("/repurpose/platform", requireAuth, (req: Request, res: Response) => {
  const { videoUrl, targetPlatform } = req.body;
  if (!videoUrl || !targetPlatform) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "videoUrl and targetPlatform are required" },
    });
    return;
  }

  try {
    const result = repurposeService.repurposeForPlatform(videoUrl, targetPlatform);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// POST /api/v1/repurpose/batch — batch repurpose for multiple platforms
router.post("/repurpose/batch", requireAuth, (req: Request, res: Response) => {
  const { videoUrl, platforms } = req.body;
  if (!videoUrl || !platforms || !Array.isArray(platforms)) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "videoUrl and platforms array are required" },
    });
    return;
  }

  try {
    const results = repurposeService.batchRepurpose(videoUrl, platforms);
    res.status(200).json({ success: true, data: results });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: { code: e.code ?? "INTERNAL_ERROR", message: e.message },
    });
  }
});

// POST /api/v1/repurpose/thumbnails — generate thumbnails
router.post("/repurpose/thumbnails", requireAuth, (req: Request, res: Response) => {
  const { videoUrl, count } = req.body;
  if (!videoUrl) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "videoUrl is required" },
    });
    return;
  }

  const result = repurposeService.generateThumbnails(videoUrl, count ?? 3);
  res.status(200).json({ success: true, data: result });
});

// POST /api/v1/repurpose/subtitles — generate subtitles
router.post("/repurpose/subtitles", requireAuth, (req: Request, res: Response) => {
  const { videoUrl, language } = req.body;
  if (!videoUrl) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "videoUrl is required" },
    });
    return;
  }

  const result = repurposeService.generateSubtitles(videoUrl, language ?? "en");
  res.status(200).json({ success: true, data: result });
});

// POST /api/v1/repurpose/trailer — generate trailer
router.post("/repurpose/trailer", requireAuth, (req: Request, res: Response) => {
  const { projectId, duration } = req.body;
  if (!projectId) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "projectId is required" },
    });
    return;
  }

  const result = repurposeService.generateTrailer(projectId, duration ?? 30);
  res.status(200).json({ success: true, data: result });
});

export default router;
