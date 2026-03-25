import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  trackEvent,
  getProjectAnalytics,
  getUserAnalytics,
  getPlatformAnalytics,
} from "../services/analyticsService";

const router = Router();

const eventSchema = z.object({
  type: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

// POST /analytics/events
router.post("/events", (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const event = trackEvent(parsed.data);
  return res.status(201).json(event);
});

// GET /analytics/project/:projectId
router.get("/project/:projectId", (req: Request, res: Response) => {
  const analytics = getProjectAnalytics(req.params.projectId);
  return res.json(analytics);
});

// GET /analytics/user/:userId
router.get("/user/:userId", (req: Request, res: Response) => {
  const analytics = getUserAnalytics(req.params.userId);
  return res.json(analytics);
});

// GET /analytics/platform
router.get("/platform", (_req: Request, res: Response) => {
  const analytics = getPlatformAnalytics();
  return res.json(analytics);
});

export default router;
