import { Router, Request, Response } from "express";
import { SignRequestSchema } from "../models/c2paSchemas";
import { createManifest, signManifest, verifyManifest, getManifestByJobId } from "../services/c2paService";

const router = Router();

router.post("/sign", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() }); return; }
  const params = parsed.data;
  const { manifest, signature, outputId } = await createManifest(params);
  res.status(201).json({ manifest, signature, manifest_url: `/governance/c2pa/manifest/${params.job_id}`, output_id: outputId });
});

router.get("/verify/:outputId", async (req: Request<{ outputId: string }>, res: Response): Promise<void> => {
  const { outputId } = req.params;
  const result = await verifyManifest(outputId);
  if (!result.valid && !result.manifest) { res.status(404).json({ error: "Manifest not found for given output ID" }); return; }
  res.status(200).json(result);
});

router.get("/manifest/:jobId", async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const entry = await getManifestByJobId(jobId);
  if (!entry) { res.status(404).json({ error: "Manifest not found for given job ID" }); return; }
  res.status(200).json({ manifest: entry.manifest, signature: entry.signature, output_id: entry.output_id, created_at: entry.created_at });
});

export default router;
