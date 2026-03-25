import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { humanReviewService } from "../services/humanReviewService.js";
import humanReviewRouter from "../routes/humanReview.js";
import { errorHandler } from "../middleware/errorHandler.js";

// Build a self-contained test app
const app = express();
app.use(express.json());
app.use("/api/v1", humanReviewRouter);
app.use(errorHandler);

// Build a mock JWT
function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "admin");
const AUTH = { Authorization: `Bearer ${TOKEN}` };

describe("Human Review Service (N6)", () => {
  beforeEach(() => {
    humanReviewService._clear();
  });

  // 1. Create a review task
  it("POST /api/v1/review-queue/tasks — creates a review task with queue position", async () => {
    const res = await request(app)
      .post("/api/v1/review-queue/tasks")
      .set(AUTH)
      .send({ jobId: "job-1", type: "content_moderation", priority: "high" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.taskId).toBeDefined();
    expect(res.body.data.queuePosition).toBe(1);
    expect(res.body.data.estimatedWait).toBe("1hr");
  });

  // 2. Assign a task to a reviewer
  it("PUT /api/v1/review-queue/tasks/:id/assign — assigns task to reviewer", async () => {
    const created = humanReviewService.createReviewTask("job-1", "quality_check", "normal");

    const res = await request(app)
      .put(`/api/v1/review-queue/tasks/${created.taskId}/assign`)
      .set(AUTH)
      .send({ reviewerId: "reviewer-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.reviewerId).toBe("reviewer-1");
    expect(res.body.data.status).toBe("assigned");
  });

  // 3. Submit a review decision
  it("PUT /api/v1/review-queue/tasks/:id/decision — submits approval decision", async () => {
    const created = humanReviewService.createReviewTask("job-1", "rights_verification", "urgent");
    humanReviewService.assignTask(created.taskId, "reviewer-1");

    const res = await request(app)
      .put(`/api/v1/review-queue/tasks/${created.taskId}/decision`)
      .set(AUTH)
      .send({ reviewerId: "reviewer-1", decision: "approve", notes: "All rights verified" });

    expect(res.status).toBe(200);
    expect(res.body.data.decision).toBe("approve");
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.notes).toBe("All rights verified");
  });

  // 4. Get queue with filters
  it("GET /api/v1/review-queue — returns filtered queue", async () => {
    humanReviewService.createReviewTask("job-1", "content_moderation", "high");
    humanReviewService.createReviewTask("job-2", "quality_check", "normal");
    humanReviewService.createReviewTask("job-3", "content_moderation", "urgent");

    const res = await request(app)
      .get("/api/v1/review-queue?type=content_moderation")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((t: { type: string }) => t.type === "content_moderation")).toBe(true);
  });

  // 5. Escalate a task
  it("PUT /api/v1/review-queue/tasks/:id/escalate — escalates and bumps priority", async () => {
    const created = humanReviewService.createReviewTask("job-1", "content_moderation", "normal");

    const res = await request(app)
      .put(`/api/v1/review-queue/tasks/${created.taskId}/escalate`)
      .set(AUTH)
      .send({ reason: "Requires senior review" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("escalated");
    expect(res.body.data.priority).toBe("high");
    expect(res.body.data.notes).toBe("Requires senior review");
  });

  // 6. Get queue metrics
  it("GET /api/v1/review-queue/metrics — returns queue metrics", async () => {
    humanReviewService.createReviewTask("job-1", "content_moderation", "high");
    humanReviewService.createReviewTask("job-2", "quality_check", "normal");

    const res = await request(app)
      .get("/api/v1/review-queue/metrics")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.pending).toBe(2);
    expect(res.body.data.by_type).toHaveProperty("content_moderation", 1);
    expect(res.body.data.by_type).toHaveProperty("quality_check", 1);
  });

  // 7. Auto-assign round-robin
  it("POST /api/v1/review-queue/auto-assign — assigns pending tasks round-robin", async () => {
    humanReviewService.createReviewTask("job-1", "content_moderation", "high");
    humanReviewService.createReviewTask("job-2", "quality_check", "normal");
    // Register reviewers by assigning then completing a dummy task
    const dummy = humanReviewService.createReviewTask("job-0", "bug_report", "low");
    humanReviewService.assignTask(dummy.taskId, "reviewer-A");
    humanReviewService.submitDecision(dummy.taskId, "reviewer-A", "approve");

    const res = await request(app)
      .post("/api/v1/review-queue/auto-assign")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.assigned).toBe(2);
  });

  // 8. Create and list support tickets
  it("POST /api/v1/support/tickets — creates a support ticket", async () => {
    const res = await request(app)
      .post("/api/v1/support/tickets")
      .set(AUTH)
      .send({ userId: "user-1", subject: "Cannot export", body: "Export fails on MP4", category: "technical" });

    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBe("Cannot export");
    expect(res.body.data.status).toBe("open");
    expect(res.body.data.id).toBeDefined();
  });

  // 9. Respond to a support ticket
  it("POST /api/v1/support/tickets/:id/respond — adds response to ticket", async () => {
    const ticket = humanReviewService.createSupportTicket("user-1", "Help", "Need help", "general");

    const res = await request(app)
      .post(`/api/v1/support/tickets/${ticket.id}/respond`)
      .set(AUTH)
      .send({ reviewerId: "reviewer-1", response: "We are looking into it" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("in_progress");
    expect(res.body.data.responses).toHaveLength(1);
    expect(res.body.data.responses[0].response).toBe("We are looking into it");
  });

  // 10. Close a support ticket
  it("PUT /api/v1/support/tickets/:id/close — closes the ticket", async () => {
    const ticket = humanReviewService.createSupportTicket("user-1", "Bug", "Found a bug", "bug");

    const res = await request(app)
      .put(`/api/v1/support/tickets/${ticket.id}/close`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("closed");
  });
});
