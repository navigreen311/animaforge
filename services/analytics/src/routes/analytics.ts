import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  ingestEvent,
  batchIngest,
  getProjectAnalytics,
  getUserAnalytics,
  getPlatformAnalytics,
  getContentAnalytics,
  getRetentionCohorts,
  DateRange,
} from "../services/analyticsService";

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  type: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(1000),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function parseDateRange(req: Request): DateRange | undefined {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from && !to) return undefined;
  return { from, to };
}

// ---------------------------------------------------------------------------
// POST /analytics/events — ingest single event
// ---------------------------------------------------------------------------

router.post("/events", async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  try {
    const event = await ingestEvent(parsed.data);
    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ error: "Failed to ingest event", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// POST /analytics/events/batch — batch ingest
// ---------------------------------------------------------------------------

router.post("/events/batch", async (req: Request, res: Response) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  try {
    const events = await batchIngest(parsed.data.events);
    return res.status(201).json({ inserted: events.length, events });
  } catch (err) {
    return res.status(500).json({ error: "Failed to batch ingest", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /analytics/project/:projectId
// ---------------------------------------------------------------------------

router.get("/project/:projectId", async (req: Request, res: Response) => {
  try {
    const range = parseDateRange(req);
    const analytics = await getProjectAnalytics(req.params.projectId, range);
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get project analytics", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /analytics/user/:userId
// ---------------------------------------------------------------------------

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const range = parseDateRange(req);
    const analytics = await getUserAnalytics(req.params.userId, range);
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get user analytics", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /analytics/platform — admin only
// ---------------------------------------------------------------------------

router.get("/platform", async (req: Request, res: Response) => {
  try {
    const range = parseDateRange(req);
    const analytics = await getPlatformAnalytics(range);
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get platform analytics", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /analytics/content/:projectId
// ---------------------------------------------------------------------------

router.get("/content/:projectId", async (req: Request, res: Response) => {
  try {
    const analytics = await getContentAnalytics(req.params.projectId);
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get content analytics", detail: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /analytics/retention
// ---------------------------------------------------------------------------

router.get("/retention", async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) === "weekly" ? "weekly" : "monthly";
    const data = await getRetentionCohorts(period);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get retention cohorts", detail: (err as Error).message });
  }
});

export default router;
