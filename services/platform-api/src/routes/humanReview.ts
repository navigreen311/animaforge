import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { humanReviewService } from "../services/humanReviewService.js";
import * as apiResponse from "../utils/apiResponse.js";

const router = Router();

// ── POST /api/v1/review-queue/tasks — create review task ───────────
router.post(
  "/review-queue/tasks",
  requireAuth,
  async (req: Request, res: Response) => {
    const { jobId, type, priority, context } = req.body;
    if (!jobId || !type) {
      apiResponse.error(res, "VALIDATION_ERROR", "jobId and type are required", 400);
      return;
    }
    const validTypes = ["content_moderation", "quality_check", "rights_verification", "customer_support", "bug_report"];
    if (!validTypes.includes(type)) {
      apiResponse.error(res, "VALIDATION_ERROR", `Invalid type. Must be one of: ${validTypes.join(", ")}`, 400);
      return;
    }
    const validPriorities = ["urgent", "high", "normal", "low"];
    const taskPriority = priority || "normal";
    if (!validPriorities.includes(taskPriority)) {
      apiResponse.error(res, "VALIDATION_ERROR", `Invalid priority. Must be one of: ${validPriorities.join(", ")}`, 400);
      return;
    }
    const result = humanReviewService.createReviewTask(jobId, type, taskPriority, context || {});
    apiResponse.success(res, result, 201);
  },
);

// ── PUT /api/v1/review-queue/tasks/:id/assign — assign task ────────
router.put(
  "/review-queue/tasks/:id/assign",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewerId } = req.body;
    if (!reviewerId) {
      apiResponse.error(res, "VALIDATION_ERROR", "reviewerId is required", 400);
      return;
    }
    const task = humanReviewService.assignTask(id, reviewerId);
    if (!task) {
      apiResponse.error(res, "NOT_FOUND", "Task not found or not assignable", 404);
      return;
    }
    apiResponse.success(res, task);
  },
);

// ── PUT /api/v1/review-queue/tasks/:id/decision — submit decision ──
router.put(
  "/review-queue/tasks/:id/decision",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewerId, decision, notes } = req.body;
    if (!reviewerId || !decision) {
      apiResponse.error(res, "VALIDATION_ERROR", "reviewerId and decision are required", 400);
      return;
    }
    const validDecisions = ["approve", "reject", "escalate", "defer"];
    if (!validDecisions.includes(decision)) {
      apiResponse.error(res, "VALIDATION_ERROR", `Invalid decision. Must be one of: ${validDecisions.join(", ")}`, 400);
      return;
    }
    const task = humanReviewService.submitDecision(id, reviewerId, decision, notes);
    if (!task) {
      apiResponse.error(res, "NOT_FOUND", "Task not found or not assigned to this reviewer", 404);
      return;
    }
    apiResponse.success(res, task);
  },
);

// ── GET /api/v1/review-queue — list queue ──────────────────────────
router.get(
  "/review-queue",
  requireAuth,
  async (req: Request, res: Response) => {
    const { type, priority, status } = req.query;
    const queue = humanReviewService.getQueue(
      type as string | undefined,
      priority as string | undefined,
      status as string | undefined,
    );
    apiResponse.success(res, queue);
  },
);

// ── PUT /api/v1/review-queue/tasks/:id/escalate — escalate ────────
router.put(
  "/review-queue/tasks/:id/escalate",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
      apiResponse.error(res, "VALIDATION_ERROR", "reason is required", 400);
      return;
    }
    const task = humanReviewService.escalateTask(id, reason);
    if (!task) {
      apiResponse.error(res, "NOT_FOUND", "Task not found", 404);
      return;
    }
    apiResponse.success(res, task);
  },
);

// ── GET /api/v1/review-queue/metrics — queue metrics ───────────────
router.get(
  "/review-queue/metrics",
  requireAuth,
  async (_req: Request, res: Response) => {
    const metrics = humanReviewService.getMetrics();
    apiResponse.success(res, metrics);
  },
);

// ── POST /api/v1/review-queue/auto-assign — trigger auto-assign ────
router.post(
  "/review-queue/auto-assign",
  requireAuth,
  async (_req: Request, res: Response) => {
    const assigned = humanReviewService.autoAssign();
    apiResponse.success(res, { assigned: assigned.length, tasks: assigned });
  },
);

// ── POST /api/v1/support/tickets — create support ticket ───────────
router.post(
  "/support/tickets",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId, subject, body, category } = req.body;
    if (!userId || !subject || !body || !category) {
      apiResponse.error(res, "VALIDATION_ERROR", "userId, subject, body, and category are required", 400);
      return;
    }
    const ticket = humanReviewService.createSupportTicket(userId, subject, body, category);
    apiResponse.success(res, ticket, 201);
  },
);

// ── GET /api/v1/support/tickets — list tickets ─────────────────────
router.get(
  "/support/tickets",
  requireAuth,
  async (req: Request, res: Response) => {
    const { userId } = req.query;
    const ticketList = humanReviewService.getTickets(userId as string | undefined);
    apiResponse.success(res, ticketList);
  },
);

// ── POST /api/v1/support/tickets/:id/respond — respond to ticket ───
router.post(
  "/support/tickets/:id/respond",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewerId, response } = req.body;
    if (!reviewerId || !response) {
      apiResponse.error(res, "VALIDATION_ERROR", "reviewerId and response are required", 400);
      return;
    }
    const ticket = humanReviewService.respondToTicket(id, reviewerId, response);
    if (!ticket) {
      apiResponse.error(res, "NOT_FOUND", "Ticket not found", 404);
      return;
    }
    apiResponse.success(res, ticket);
  },
);

// ── PUT /api/v1/support/tickets/:id/close — close ticket ───────────
router.put(
  "/support/tickets/:id/close",
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticket = humanReviewService.closeTicket(id);
    if (!ticket) {
      apiResponse.error(res, "NOT_FOUND", "Ticket not found", 404);
      return;
    }
    apiResponse.success(res, ticket);
  },
);

export default router;
