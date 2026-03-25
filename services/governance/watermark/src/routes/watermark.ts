import { Router, Request, Response } from "express";
import { z } from "zod";
import { embedWatermark, detectWatermark } from "../services/watermarkService";

const router = Router();
const EmbedSchema = z.object({ job_id: z.string().min(1), output_url: z.string().url(), watermark_data: z.record(z.unknown()) });
const DetectSchema = z.object({ content_url: z.string().url() });

router.post("/governance/watermark/embed", async (req: Request, res: Response): Promise<void> => {
  const parsed = EmbedSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { job_id, output_url, watermark_data } = parsed.data;
  const result = await embedWatermark(job_id, output_url, watermark_data);
  res.status(201).json(result);
});

router.post("/governance/watermark/detect", async (req: Request, res: Response): Promise<void> => {
  const parsed = DetectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.issues }); return; }
  const { content_url } = parsed.data;
  const result = await detectWatermark(content_url);
  res.status(200).json(result);
});

export default router;
