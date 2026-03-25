import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type {
  Review,
  Comment,
  ReviewStatus,
  ApprovalLevel,
  CreateReviewInput,
  SubmitReviewInput,
  CommentInput,
} from "../models/reviewSchemas.js";

// ── In-memory stores ────────────────────────────────────────────────
const reviews = new Map<string, Review>();
const comments = new Map<string, Comment>();

// ── Approval level progression ──────────────────────────────────────
const APPROVAL_ORDER: ApprovalLevel[] = ["editor", "director", "final"];

function nextLevel(current: ApprovalLevel): ApprovalLevel | null {
  const idx = APPROVAL_ORDER.indexOf(current);
  if (idx < 0 || idx >= APPROVAL_ORDER.length - 1) return null;
  return APPROVAL_ORDER[idx + 1];
}

export const reviewService = {
  /**
   * Create a new review for a shot. Determines the round automatically.
   */
  async createReview(
    shotId: string,
    reviewerId: string,
    projectId: string = "00000000-0000-4000-8000-000000000001",
  ): Promise<Review> {
    if (prisma) {
      try {
        return await prisma.review.create({
          data: {
            shotId,
            reviewerId,
            projectId,
            status: "pending",
            approvalLevel: "editor",
            round: 1,
          },
        }) as unknown as Review;
      } catch {
        // Prisma not set up -- fall through to in-memory
      }
    }

    // Determine round number based on existing reviews for this shot
    const existing = Array.from(reviews.values()).filter(
      (r) => r.shotId === shotId,
    );
    const round = existing.length + 1;

    const now = new Date().toISOString();
    const review: Review = {
      id: uuidv4(),
      shotId,
      projectId,
      reviewerId,
      status: "pending",
      approvalLevel: "editor",
      round,
      comments: undefined,
      timecodeRef: undefined,
      createdAt: now,
      updatedAt: now,
    };
    reviews.set(review.id, review);
    return review;
  },

  /**
   * Submit a review decision (approve, changes_requested, or rejected).
   * On approval at non-final level, the review stays but can be escalated.
   */
  async submitReview(
    reviewId: string,
    status: ReviewStatus,
    reviewComments?: string,
  ): Promise<Review | undefined> {
    if (prisma) {
      try {
        const existing = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!existing) return undefined;
        const updated = await prisma.review.update({
          where: { id: reviewId },
          data: { status, comments: reviewComments, updatedAt: new Date() },
        });
        return updated as unknown as Review;
      } catch {
        // fall through
      }
    }

    const review = reviews.get(reviewId);
    if (!review) return undefined;

    review.status = status;
    if (reviewComments !== undefined) review.comments = reviewComments;
    review.updatedAt = new Date().toISOString();
    reviews.set(reviewId, review);
    return review;
  },

  /**
   * Add a comment to a review, with optional threading via parentId.
   */
  async addComment(
    reviewId: string,
    authorId: string,
    body: string,
    timecodeMs?: number,
    parentId?: string,
  ): Promise<Comment | undefined> {
    // Verify review exists
    const review = reviews.get(reviewId);
    if (!review) return undefined;

    // If parentId given, verify parent exists
    if (parentId && !comments.has(parentId)) return undefined;

    const comment: Comment = {
      id: uuidv4(),
      reviewId,
      authorId,
      body,
      timecodeMs,
      parentId,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    comments.set(comment.id, comment);
    return comment;
  },

  /**
   * Get full review history for a shot, ordered by round, with comments.
   */
  async getReviewHistory(shotId: string): Promise<(Review & { reviewComments: Comment[] })[]> {
    const shotReviews = Array.from(reviews.values())
      .filter((r) => r.shotId === shotId)
      .sort((a, b) => a.round - b.round);

    return shotReviews.map((review) => ({
      ...review,
      reviewComments: Array.from(comments.values())
        .filter((c) => c.reviewId === review.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
  },

  /**
   * Get all reviews for a project, optionally filtered by status.
   */
  async getReviewsByProject(
    projectId: string,
    status?: ReviewStatus,
  ): Promise<Review[]> {
    let projectReviews = Array.from(reviews.values()).filter(
      (r) => r.projectId === projectId,
    );
    if (status) {
      projectReviews = projectReviews.filter((r) => r.status === status);
    }
    return projectReviews.sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  },

  /**
   * Escalate a review to the next approval level.
   * Flow: editor → director → final (lock).
   */
  async escalateReview(reviewId: string): Promise<Review | undefined> {
    const review = reviews.get(reviewId);
    if (!review) return undefined;
    if (review.status !== "approved") return undefined;

    const next = nextLevel(review.approvalLevel);
    if (!next) return undefined; // already at final

    review.approvalLevel = next;
    review.status = "pending";
    review.updatedAt = new Date().toISOString();
    reviews.set(reviewId, review);
    return review;
  },

  /**
   * Mark a comment as resolved.
   */
  async resolveComment(commentId: string): Promise<Comment | undefined> {
    const comment = comments.get(commentId);
    if (!comment) return undefined;

    comment.resolved = true;
    comments.set(commentId, comment);
    return comment;
  },

  /**
   * Retrieve a single review by ID.
   */
  async getById(reviewId: string): Promise<Review | undefined> {
    return reviews.get(reviewId);
  },

  /**
   * Retrieve a single comment by ID.
   */
  async getCommentById(commentId: string): Promise<Comment | undefined> {
    return comments.get(commentId);
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    reviews.clear();
    comments.clear();
  },
};
