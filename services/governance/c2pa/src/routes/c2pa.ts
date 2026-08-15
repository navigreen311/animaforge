import { Router, Request, Response } from 'express';
import { SignRequestSchema, VerifyAssetRequestSchema } from '../models/c2paSchemas';
import {
  createManifest,
  getCapabilities,
  getManifestByJobId,
  verifyManifest,
  verifySuppliedAsset,
} from '../services/c2paService';

const router = Router();

router.post('/sign', async (req: Request, res: Response): Promise<void> => {
  const parsed = SignRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const result = await createManifest(parsed.data);
  res.status(201).json(result);
});

/**
 * Verify by output id. Can only reach "valid" when the recorded asset is still
 * readable from this service; otherwise it answers "unverified".
 */
router.get(
  '/verify/:outputId',
  async (req: Request<{ outputId: string }>, res: Response): Promise<void> => {
    const result = await verifyManifest(req.params.outputId);
    if (result.status === 'not_found') {
      res.status(404).json(result);
      return;
    }
    res.status(200).json(result);
  },
);

/** Verify a caller-supplied asset — the authoritative cryptographic check. */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const parsed = VerifyAssetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  res.status(200).json(await verifySuppliedAsset(parsed.data));
});

router.get(
  '/manifest/:jobId',
  async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
    const entry = await getManifestByJobId(req.params.jobId);
    if (!entry) {
      res.status(404).json({ error: 'Manifest not found for given job ID' });
      return;
    }
    res.status(200).json(entry);
  },
);

router.get('/capabilities', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getCapabilities());
});

export default router;
