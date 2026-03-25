import { Router, Request, Response } from 'express';
import {
  calculateUsage,
  calculateUserUsage,
  archiveAsset,
  restoreAsset,
  cleanupOrphans,
  getDefaultPolicies,
  setRetentionPolicy,
  checkQuota,
} from '../services/lifecycleService';
import { SetRetentionPolicyRequestSchema, CleanupRequestSchema } from '../models/storageSchemas';

const router = Router();

// GET /storage/usage/:projectId — storage usage by type
router.get('/usage/:projectId', (req: Request<{ projectId: string }>, res: Response) => {
  try {
    const usage = calculateUsage(req.params.projectId);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate usage' });
  }
});

// GET /storage/usage/user/:userId — cross-project usage
router.get('/usage/user/:userId', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const usage = calculateUserUsage(req.params.userId);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate user usage' });
  }
});

// POST /storage/archive/:assetId — archive to cold storage
router.post('/archive/:assetId', (req: Request<{ assetId: string }>, res: Response) => {
  try {
    const result = archiveAsset(req.params.assetId);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive asset' });
  }
});

// POST /storage/restore/:assetId — restore from cold storage
router.post('/restore/:assetId', (req: Request<{ assetId: string }>, res: Response) => {
  try {
    const result = restoreAsset(req.params.assetId);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore asset' });
  }
});

// POST /storage/cleanup — cleanup orphaned/expired files
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const parsed = CleanupRequestSchema.safeParse(req.body ?? {});
    const dryRun = parsed.success ? parsed.data.dryRun : false;
    const result = cleanupOrphans(dryRun);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run cleanup' });
  }
});

// GET /storage/policies — default lifecycle policies
router.get('/policies', (_req: Request, res: Response) => {
  try {
    const policies = getDefaultPolicies();
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

// PUT /storage/policies/:projectId — set project retention policy
router.put('/policies/:projectId', (req: Request<{ projectId: string }>, res: Response) => {
  try {
    const parsed = SetRetentionPolicyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }
    const policy = setRetentionPolicy(req.params.projectId, parsed.data);
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set retention policy' });
  }
});

// GET /storage/quota/:userId — quota vs tier limits
router.get('/quota/:userId', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const quota = checkQuota(req.params.userId);
    res.json(quota);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check quota' });
  }
});

export default router;
