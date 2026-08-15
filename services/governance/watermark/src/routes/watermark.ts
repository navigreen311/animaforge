import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  detectWatermark,
  embedWatermark,
  getCapabilities,
} from "../services/watermarkService";

const router = Router();

const AssetSchema = {
  asset_base64: z.string().min(1).optional(),
  asset_path: z.string().min(1).optional(),
  asset_url: z.string().url().optional(),
  mime_type: z.string().min(1).optional(),
  output_path: z.string().min(1).optional(),
};

const EmbedSchema = z.object({
  job_id: z.string().min(1),
  output_url: z.string().url().optional(),
  watermark_data: z.record(z.unknown()).optional(),
  ...AssetSchema,
});

const DetectSchema = z
  .object({
    /** Kept for backwards compatibility; only usable with remote fetch enabled. */
    content_url: z.string().url().optional(),
    ...AssetSchema,
  })
  .refine(
    (v) => v.content_url || v.asset_base64 || v.asset_path || v.asset_url,
    {
      message:
        "one of content_url, asset_base64, asset_path or asset_url is required",
    },
  );

router.post(
  "/governance/watermark/embed",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = EmbedSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const { job_id, output_url, watermark_data, ...asset } = parsed.data;
    try {
      const result = await embedWatermark(
        job_id,
        output_url ?? null,
        watermark_data ?? {},
        asset,
      );
      res.status(201).json(result);
    } catch (err) {
      res.status(422).json({
        error: "Watermark embedding failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

router.post(
  "/governance/watermark/detect",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = DetectSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const { content_url, ...asset } = parsed.data;
    const result = await detectWatermark({
      ...asset,
      // A bare content_url can only be used when remote fetching is enabled;
      // otherwise detection reports that it had nothing to analyse.
      asset_url: asset.asset_url ?? content_url,
    });
    res.status(200).json(result);
  },
);

router.get(
  "/governance/watermark/capabilities",
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await getCapabilities());
  },
);

export default router;
