import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reviewService } from "../services/reviewService.js";
import * as apiResponse from "../utils/apiResponse.js";
import {
  CreateReviewSchema,
  SubmitReviewSchema,
  CommentSchema,
  ReviewParamsSchema,
  ShotParamsSchema,
  ProjectParamsSchema,
  CommentParamsSchema,
  ProjectQuerySchema,
} from "../models/reviewSchemas.js";

const router = Router();

// ── POST /api/v1/reviews — create review for shot ──────────────────
router.post(
  "/reviews",
  requireAuth,
  validate(CreateReviewSchema, "body"),
  async (req: Request, res: Response) => {
    const { shotId, reviewerId } = req.body;
    const projectId = req.body.projectId ?? "00000000-0000-4000-8000-000000000001";
    const review = await reviewService.createReview(shotId, reviewerId, projectId);
    apiResponse.success(res, review, 201);
  },
);

// ── PUT /api/v1/reviews/:id — submit review decision ───────────────
router.put(
  "/reviews/:id",
  requireAuth,
  validate(ReviewParamsSchema, "params"),
  validate(SubmitReviewSchema, "body"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, comments } = req.body;
    const review = await reviewService.submitReview(id, status, comments);
    if (!review) {
      apiResponse.error(res, "NOT_FOUND", "Review not found", 404);
      return;
    }
    apiResponse.success(res, review);
  },
);

// ── POST /api/v1/reviews/:id/comments — add comment ────────────────
router.post(
  "/reviews/:id/comments",
  requireAuth,
  validate(ReviewParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorId, body, timecodeMs, parentId } = req.body;
    if (!authorId || !body) {
      apiResponse.error(res, "VALIDATION_ERROR", "authorId and body are required", 400);
      return;
    }
    const comment = await reviewService.addComment(id, authorId, body, timecodeMs, parentId);
    if (!comment) {
      apiResponse.error(res, "NOT_FOUND", "Review not found or invalid parentId", 404);
      return;
    }
    apiResponse.success(res, comment, 201);
  },
);

// ── GET /api/v1/reviews/shot/:shotId — review history for shot ──────
router.get(
  "/reviews/shot/:shotId",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { shotId } = req.params;
    const history = await reviewService.getReviewHistory(shotId);
    apiResponse.success(res, history);
  },
);

// ── GET /api/v1/reviews/project/:projectId — reviews for project ────
router.get(
  "/reviews/project/:projectId",
  requireAuth,
  validate(ProjectParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const parsed = ProjectQuerySchema.safeParse(req.query);
    const status = parsed.success ? parsed.data.status : undefined;
    const reviews = await reviewService.getReviewsByProject(projectId, status);
    apiResponse.success(res, reviews);
  },
);

// ── PUT /api/v1/reviews/:id/escalate — escalate to next approver ────
router.put(
  "/reviews/:id/escalate",
  requireAuth,
  validate(ReviewParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const review = await reviewService.escalateReview(id);
    if (!review) {
      apiResponse.error(
        res,
        "ESCALATION_FAILED",
        "Review not found, not approved, or already at final level",
        400,
      );
      return;
    }
    apiResponse.success(res, review);
  },
);

// ── PUT /api/v1/comments/:id/resolve — resolve a comment ───────────
router.put(
  "/comments/:id/resolve",
  requireAuth,
  validate(CommentParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const comment = await reviewService.resolveComment(id);
    if (!comment) {
      apiResponse.error(res, "NOT_FOUND", "Comment not found", 404);
      return;
    }
    apiResponse.success(res, comment);
  },
);

export default router;
