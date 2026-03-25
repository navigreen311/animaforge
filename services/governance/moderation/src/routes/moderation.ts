import { Router, Request, Response } from "express";
import {
  ModerateRequestSchema,
  PreCheckRequestSchema,
} from "../models/moderationSchemas";
import {
  moderate,
  preCheck,
  getModerationLog,
} from "../services/moderationService";

const router = Router();

// POST /governance/moderate
router.post("/governance/moderate", (req: Request, res: Response): void => {
  const parsed = ModerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = moderate(parsed.data);
  res.json(result);
});

// POST /governance/moderate/pre-check
router.post(
  "/governance/moderate/pre-check",
  (req: Request, res: Response): void => {
    const parsed = PreCheckRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = preCheck(parsed.data);
    res.json(result);
  }
);

// GET /governance/moderation-log/:jobId
router.get(
  "/governance/moderation-log/:jobId",
  (req: Request, res: Response): void => {
    const jobId = req.params.jobId as string;
    const records = getModerationLog(jobId);
    res.json(records);
  }
);

export default router;
