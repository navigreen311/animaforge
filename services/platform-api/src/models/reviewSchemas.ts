import { z } from "zod";

// ── Review status enum ──────────────────────────────────────────────
export const ReviewStatusEnum = z.enum([
  "pending",
  "approved",
  "changes_requested",
  "rejected",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

// ── Approval levels (multi-step flow) ───────────────────────────────
export const ApprovalLevelEnum = z.enum([
  "editor",
  "director",
  "final",
]);
export type ApprovalLevel = z.infer<typeof ApprovalLevelEnum>;

// ── Zod schemas ─────────────────────────────────────────────────────
export const CreateReviewSchema = z.object({
  shotId: z.string().uuid(),
  reviewerId: z.string().min(1, "Reviewer ID is required"),
  status: ReviewStatusEnum.default("pending"),
  comments: z.string().optional(),
  timecodeRef: z.string().optional(),
});

export const SubmitReviewSchema = z.object({
  status: z.enum(["approved", "changes_requested", "rejected"]),
  comments: z.string().optional(),
});

export const CommentSchema = z.object({
  reviewId: z.string().uuid(),
  authorId: z.string().min(1, "Author ID is required"),
  body: z.string().min(1, "Comment body is required"),
  timecodeMs: z.number().int().nonnegative().optional(),
  parentId: z.string().uuid().optional(),
});

export const ReviewRoundSchema = z.object({
  round: z.number().int().positive(),
  reviewerId: z.string().min(1),
  status: ReviewStatusEnum,
  comments: z.array(z.any()),
  createdAt: z.string(),
});

// ── Param schemas ───────────────────────────────────────────────────
export const ReviewParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ShotParamsSchema = z.object({
  shotId: z.string().uuid(),
});

export const ProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const CommentParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ProjectQuerySchema = z.object({
  status: ReviewStatusEnum.optional(),
});

// ── TypeScript interfaces ───────────────────────────────────────────
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type CommentInput = z.infer<typeof CommentSchema>;
export type ReviewRound = z.infer<typeof ReviewRoundSchema>;

export interface Comment {
  id: string;
  reviewId: string;
  authorId: string;
  body: string;
  timecodeMs?: number;
  parentId?: string;
  resolved: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  shotId: string;
  projectId: string;
  reviewerId: string;
  status: ReviewStatus;
  approvalLevel: ApprovalLevel;
  round: number;
  comments: string | undefined;
  timecodeRef: string | undefined;
  createdAt: string;
  updatedAt: string;
}
