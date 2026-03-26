import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { reproducibilityService } from "../services/reproducibilityService.js";
import * as apiResponse from "../utils/apiResponse.js";

const router = Router();

// ── POST /api/v1/reproducibility/snapshot — capture snapshot ────────
router.post(
  "/reproducibility/snapshot",
  requireAuth,
  async (req: Request, res: Response) => {
    const { jobId, parameters } = req.body;
    if (!jobId || !parameters) {
      apiResponse.error(res, "VALIDATION_ERROR", "jobId and parameters are required", 400);
      return;
    }
    const snapshot = await reproducibilityService.captureSnapshot(jobId, parameters);
    apiResponse.success(res, snapshot, 201);
  },
);

// ── GET /api/v1/reproducibility/snapshot/:id — get snapshot ─────────
router.get(
  "/reproducibility/snapshot/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const snapshot = await reproducibilityService.getSnapshot(id);
    if (!snapshot) {
      apiResponse.error(res, "NOT_FOUND", "Snapshot not found", 404);
      return;
    }
    apiResponse.success(res, snapshot);
  },
);

// ── POST /api/v1/reproducibility/replay/:snapshotId — replay ───────
router.post(
  "/reproducibility/replay/:snapshotId",
  requireAuth,
  async (req: Request, res: Response) => {
    const { snapshotId } = req.params;
    const result = await reproducibilityService.replayGeneration(snapshotId);
    if (!result) {
      apiResponse.error(res, "NOT_FOUND", "Snapshot not found", 404);
      return;
    }
    apiResponse.success(res, result, 201);
  },
);

// ── POST /api/v1/reproducibility/compare — compare two snapshots ────
router.post(
  "/reproducibility/compare",
  requireAuth,
  async (req: Request, res: Response) => {
    const { snapshotIdA, snapshotIdB } = req.body;
    if (!snapshotIdA || !snapshotIdB) {
      apiResponse.error(res, "VALIDATION_ERROR", "snapshotIdA and snapshotIdB are required", 400);
      return;
    }
    const diff = await reproducibilityService.compareSnapshots(snapshotIdA, snapshotIdB);
    if (!diff) {
      apiResponse.error(res, "NOT_FOUND", "One or both snapshots not found", 404);
      return;
    }
    apiResponse.success(res, diff);
  },
);

// ── GET /api/v1/reproducibility/lineage/:jobId — job lineage ────────
router.get(
  "/reproducibility/lineage/:jobId",
  requireAuth,
  async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const lineage = await reproducibilityService.getJobLineage(jobId);
    apiResponse.success(res, lineage);
  },
);

export default router;
