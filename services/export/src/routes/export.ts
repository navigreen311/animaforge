import { Router, Request, Response } from "express";
import { VideoExportSchema, AudioExportSchema, ProjectExportSchema, AvatarExportSchema } from "../models/exportSchemas";
import { createExportJob, getJob, processVideoExport, processAudioExport, processProjectExport, processAvatarExport, getExportFormats } from "../services/exportService";

const router = Router();

router.post("/export/video", (req: Request, res: Response) => {
  const parsed = VideoExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }
  const job = createExportJob("video", parsed.data);
  const result = processVideoExport(job);
  if (result.status === "failed") {
    return res.status(422).json({ error: result.error, jobId: result.id });
  }
  return res.status(201).json(result);
});

router.post("/export/audio", (req: Request, res: Response) => {
  const parsed = AudioExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }
  const job = createExportJob("audio", parsed.data);
  const result = processAudioExport(job);
  return res.status(201).json(result);
});

router.post("/export/project", (req: Request, res: Response) => {
  const parsed = ProjectExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }
  const job = createExportJob("project", parsed.data);
  const result = processProjectExport(job);
  return res.status(201).json(result);
});

router.post("/export/avatar", (req: Request, res: Response) => {
  const parsed = AvatarExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }
  const job = createExportJob("avatar", parsed.data);
  const result = processAvatarExport(job);
  return res.status(201).json(result);
});

router.get("/export/jobs/:id", (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Export job not found" });
  }
  return res.json(job);
});

router.get("/export/formats", (_req: Request, res: Response) => {
  const formats = getExportFormats();
  return res.json({ formats });
});

export default router;
