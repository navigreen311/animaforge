import { Router, Request, Response } from "express";
import { ModerateRequestSchema, PreCheckRequestSchema } from "../models/moderationSchemas";
import { moderate, preCheck, getModerationLog } from "../services/moderationService";

const router = Router();

router.post("/governance/moderate", async (req: Request, res: Response): Promise<void> => {
  const parsed = ModerateRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const result = await moderate(parsed.data);
  res.json(result);
});

router.post("/governance/moderate/pre-check", async (req: Request, res: Response): Promise<void> => {
  const parsed = PreCheckRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const result = await preCheck(parsed.data);
  res.json(result);
});

router.get("/governance/moderation-log/:jobId", async (req: Request, res: Response): Promise<void> => {
  const jobId = req.params.jobId as string;
  const records = await getModerationLog(jobId);
  res.json(records);
});

export default router;
