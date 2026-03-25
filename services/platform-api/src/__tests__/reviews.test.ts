import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { reviewService } from "../services/reviewService.js";
import reviewsRouter from "../routes/reviews.js";
import { errorHandler } from "../middleware/errorHandler.js";

// Build a self-contained test app
const app = express();
app.use(express.json());
app.use("/api/v1", reviewsRouter);
app.use(errorHandler);

// Build a mock JWT: header.payload.signature (base64url-encoded)
function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "editor");
const AUTH = { Authorization: `Bearer ${TOKEN}` };

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const SHOT_ID = "00000000-0000-4000-8000-000000000010";

describe("Review Workflow", () => {
  beforeEach(() => {
    reviewService._clear();
  });

  // 1. Create a review
  it("POST /api/v1/reviews — creates a review with pending status", async () => {
    const res = await request(app)
      .post("/api/v1/reviews")
      .set(AUTH)
      .send({ shotId: SHOT_ID, reviewerId: "user-1" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shotId).toBe(SHOT_ID);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.approvalLevel).toBe("editor");
    expect(res.body.data.round).toBe(1);
    expect(res.body.data.id).toBeDefined();
  });

  // 2. Submit approval
  it("PUT /api/v1/reviews/:id — approves a review", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);

    const res = await request(app)
      .put(`/api/v1/reviews/${review.id}`)
      .set(AUTH)
      .send({ status: "approved", comments: "Looks great!" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(res.body.data.comments).toBe("Looks great!");
  });

  // 3. Submit changes_requested
  it("PUT /api/v1/reviews/:id — requests changes on a review", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);

    const res = await request(app)
      .put(`/api/v1/reviews/${review.id}`)
      .set(AUTH)
      .send({ status: "changes_requested", comments: "Fix the lighting" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("changes_requested");
    expect(res.body.data.comments).toBe("Fix the lighting");
  });

  // 4. Add comments to a review
  it("POST /api/v1/reviews/:id/comments — adds a comment", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);

    const res = await request(app)
      .post(`/api/v1/reviews/${review.id}/comments`)
      .set(AUTH)
      .send({ authorId: "user-2", body: "Needs more contrast", timecodeMs: 1500 });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe("Needs more contrast");
    expect(res.body.data.timecodeMs).toBe(1500);
    expect(res.body.data.reviewId).toBe(review.id);
    expect(res.body.data.resolved).toBe(false);
  });

  // 5. Threaded comments
  it("POST /api/v1/reviews/:id/comments — supports threading via parentId", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    const parent = await reviewService.addComment(review.id, "user-2", "Fix this frame");

    const res = await request(app)
      .post(`/api/v1/reviews/${review.id}/comments`)
      .set(AUTH)
      .send({ authorId: "user-1", body: "Done, see updated render", parentId: parent!.id });

    expect(res.status).toBe(201);
    expect(res.body.data.parentId).toBe(parent!.id);
  });

  // 6. Review history for a shot
  it("GET /api/v1/reviews/shot/:shotId — returns review history ordered by round", async () => {
    await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    await reviewService.createReview(SHOT_ID, "user-2", PROJECT_ID);

    const res = await request(app)
      .get(`/api/v1/reviews/shot/${SHOT_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].round).toBe(1);
    expect(res.body.data[1].round).toBe(2);
  });

  // 7. Escalation flow: editor → director → final
  it("PUT /api/v1/reviews/:id/escalate — escalates from editor to director", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    await reviewService.submitReview(review.id, "approved");

    const res = await request(app)
      .put(`/api/v1/reviews/${review.id}/escalate`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.approvalLevel).toBe("director");
    expect(res.body.data.status).toBe("pending");

    // Approve again and escalate to final
    await reviewService.submitReview(review.id, "approved");
    const res2 = await request(app)
      .put(`/api/v1/reviews/${review.id}/escalate`)
      .set(AUTH);

    expect(res2.status).toBe(200);
    expect(res2.body.data.approvalLevel).toBe("final");
    expect(res2.body.data.status).toBe("pending");
  });

  // 8. Resolve a comment
  it("PUT /api/v1/comments/:id/resolve — resolves a comment", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    const comment = await reviewService.addComment(review.id, "user-2", "Fix color grading");

    const res = await request(app)
      .put(`/api/v1/comments/${comment!.id}/resolve`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.resolved).toBe(true);
  });

  // 9. Project-level aggregation
  it("GET /api/v1/reviews/project/:projectId — returns all reviews for a project", async () => {
    const shotId2 = "00000000-0000-4000-8000-000000000020";
    await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    await reviewService.createReview(shotId2, "user-2", PROJECT_ID);
    const r3 = await reviewService.createReview(SHOT_ID, "user-3", PROJECT_ID);
    await reviewService.submitReview(r3.id, "approved");

    // All reviews for project
    const res = await request(app)
      .get(`/api/v1/reviews/project/${PROJECT_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);

    // Filtered by status
    const res2 = await request(app)
      .get(`/api/v1/reviews/project/${PROJECT_ID}?status=approved`)
      .set(AUTH);

    expect(res2.status).toBe(200);
    expect(res2.body.data).toHaveLength(1);
    expect(res2.body.data[0].status).toBe("approved");
  });

  // 10. Escalation fails if review is not approved
  it("PUT /api/v1/reviews/:id/escalate — fails if review is not approved", async () => {
    const review = await reviewService.createReview(SHOT_ID, "user-1", PROJECT_ID);
    // review is still 'pending', not approved

    const res = await request(app)
      .put(`/api/v1/reviews/${review.id}/escalate`)
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ESCALATION_FAILED");
  });
});
