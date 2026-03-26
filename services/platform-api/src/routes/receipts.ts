import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { receiptService } from "../services/receiptService.js";
import * as apiResponse from "../utils/apiResponse.js";

const router = Router();

// ── POST /api/v1/receipts — create a receipt ────────────────────────
router.post(
  "/receipts",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId, action, details } = req.body;
    if (!userId || !action) {
      apiResponse.error(res, "VALIDATION_ERROR", "userId and action are required", 400);
      return;
    }
    try {
      const receipt = await receiptService.createReceipt(userId, action, details ?? {});
      apiResponse.success(res, receipt, 201);
    } catch (err: any) {
      apiResponse.error(res, "INVALID_ACTION", err.message, 400);
    }
  },
);

// ── GET /api/v1/receipts — list user's receipts (paginated) ─────────
router.get(
  "/receipts",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.query.userId as string ?? req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const result = await receiptService.getReceipts(userId, page, limit);
    apiResponse.success(res, result);
  },
);

// ── GET /api/v1/receipts/summary — user activity summary ────────────
// NOTE: must be before /receipts/:id to avoid route collision
router.get(
  "/receipts/summary",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.query.userId as string ?? req.user!.id;
    const period = (req.query.period as string) ?? "all";
    const summary = await receiptService.generateSummary(userId, period);
    apiResponse.success(res, summary);
  },
);

// ── GET /api/v1/receipts/project/:projectId — project receipts ──────
router.get(
  "/receipts/project/:projectId",
  requireAuth,
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const projectReceipts = await receiptService.getReceiptsByProject(projectId);
    apiResponse.success(res, projectReceipts);
  },
);

// ── GET /api/v1/receipts/:id — get receipt detail ───────────────────
router.get(
  "/receipts/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const receipt = await receiptService.getReceipt(id);
    if (!receipt) {
      apiResponse.error(res, "NOT_FOUND", "Receipt not found", 404);
      return;
    }
    apiResponse.success(res, receipt);
  },
);

export default router;
