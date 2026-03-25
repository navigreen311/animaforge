import { Router, Request, Response } from "express";
import { SignRequestSchema } from "../models/c2paSchemas";
import {
  createManifest,
  signManifest,
  storeManifest,
  verifyManifest,
  getManifestByJobId,
} from "../services/c2paService";

const router = Router();

/**
 * POST /governance/c2pa/sign
 * Create and sign a C2PA manifest for an AI-generated asset.
 */
router.post("/sign", (req: Request, res: Response): void => {
  const parsed = SignRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
    return;
  }

  const params = parsed.data;
  const manifest = createManifest(params);
  const signature = signManifest(manifest);
  const outputId = storeManifest(params.job_id, manifest, signature);
  const manifestUrl = `/governance/c2pa/manifest/${params.job_id}`;

  res.status(201).json({
    manifest,
    signature,
    manifest_url: manifestUrl,
    output_id: outputId,
  });
});

/**
 * GET /governance/c2pa/verify/:outputId
 * Verify a signed manifest by output ID.
 */
router.get("/verify/:outputId", (req: Request<{ outputId: string }>, res: Response): void => {
  const { outputId } = req.params;
  const result = verifyManifest(outputId);

  if (!result.valid && !result.manifest) {
    res.status(404).json({ error: "Manifest not found for given output ID" });
    return;
  }

  res.status(200).json(result);
});

/**
 * GET /governance/c2pa/manifest/:jobId
 * Retrieve a stored manifest by job ID.
 */
router.get("/manifest/:jobId", (req: Request<{ jobId: string }>, res: Response): void => {
  const { jobId } = req.params;
  const entry = getManifestByJobId(jobId);

  if (!entry) {
    res.status(404).json({ error: "Manifest not found for given job ID" });
    return;
  }

  res.status(200).json({
    manifest: entry.manifest,
    signature: entry.signature,
    output_id: entry.output_id,
    created_at: entry.created_at,
  });
});

export default router;
