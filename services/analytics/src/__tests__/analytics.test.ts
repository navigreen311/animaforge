import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearAll } from "../services/analyticsService";

describe("Analytics Service — ClickHouse-backed (in-memory fallback)", () => {
  beforeEach(() => {
    clearAll();
  });

  // 1. Health check
  it("should return health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("analytics");
  });

  // 2. Single event ingestion
  it("should ingest a single event via POST /analytics/events", async () => {
    const res = await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { style: "anime", credits: 5, quality: 0.95 },
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe("generation");
    expect(res.body.userId).toBe("user-1");
  });

  // 3. Batch event ingestion
  it("should batch ingest events via POST /analytics/events/batch", async () => {
    const res = await request(app)
      .post("/analytics/events/batch")
      .send({
        events: [
          { type: "generation", userId: "user-1", projectId: "proj-1", metadata: { credits: 5 } },
          { type: "generation", userId: "user-2", projectId: "proj-1", metadata: { credits: 3 } },
          { type: "view", userId: "user-3", projectId: "proj-1" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(3);
    expect(res.body.events).toHaveLength(3);
  });

  // 4. Validation — reject missing required fields
  it("should reject events with missing required fields", async () => {
    const res = await request(app).post("/analytics/events").send({
      metadata: { style: "anime" },
    });
    expect(res.status).toBe(400);
  });

  // 5. Project analytics
  it("should return project analytics with generation counts and quality", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { credits: 5, quality: 0.9, style: "anime", generationType: "video" },
    });
    await request(app).post("/analytics/events").send({
      type: "job_complete",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { credits: 3, quality: 0.8, style: "anime", generationType: "audio", renderTime: 12.5 },
    });

    const res = await request(app).get("/analytics/project/proj-1");
    expect(res.status).toBe(200);
    expect(res.body.totalGenerations).toBe(2);
    expect(res.body.avgQualityScore).toBe(0.85);
    expect(res.body.totalCreditsUsed).toBe(8);
    expect(res.body.generationsByType.video).toBe(1);
    expect(res.body.generationsByType.audio).toBe(1);
    expect(res.body.topStyles).toEqual([{ style: "anime", count: 2 }]);
    expect(res.body.avgRenderTime).toBe(12.5);
  });

  // 6. User analytics
  it("should return user analytics with projects, generations, and credits", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { credits: 10, style: "realistic" },
    });
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-2",
      metadata: { credits: 5, style: "realistic" },
    });

    const res = await request(app).get("/analytics/user/user-1");
    expect(res.status).toBe(200);
    expect(res.body.totalProjects).toBe(2);
    expect(res.body.totalGenerations).toBe(2);
    expect(res.body.creditsUsed).toBe(15);
    expect(res.body.creditsRemaining).toBe(985);
    expect(res.body.mostUsedStyle).toBe("realistic");
  });

  // 7. Platform analytics
  it("should return platform-wide analytics", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      metadata: { style: "anime", credits: 5 },
    });
    await request(app).post("/analytics/events").send({
      type: "job_complete",
      userId: "user-2",
      metadata: { style: "anime", credits: 3 },
    });
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      metadata: { style: "realistic", credits: 7 },
    });

    const res = await request(app).get("/analytics/platform");
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(2);
    expect(res.body.activeUsers).toBe(2);
    expect(res.body.totalJobs).toBe(3);
    expect(res.body.popularStyles[0].style).toBe("anime");
    expect(res.body.popularStyles[0].count).toBe(2);
    expect(res.body.revenueEstimate).toBe(1.5);
    expect(res.body.topCreators).toHaveLength(2);
  });

  // 8. Content analytics
  it("should return content analytics with engagement metrics", async () => {
    await request(app).post("/analytics/events").send({
      type: "view",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { watchTime: 30 },
    });
    await request(app).post("/analytics/events").send({
      type: "view",
      userId: "user-2",
      projectId: "proj-1",
      metadata: { watchTime: 60 },
    });
    await request(app).post("/analytics/events").send({
      type: "share",
      userId: "user-1",
      projectId: "proj-1",
    });
    await request(app).post("/analytics/events").send({
      type: "export",
      userId: "user-2",
      projectId: "proj-1",
    });

    const res = await request(app).get("/analytics/content/proj-1");
    expect(res.status).toBe(200);
    expect(res.body.viewCount).toBe(2);
    expect(res.body.shareCount).toBe(1);
    expect(res.body.exportCount).toBe(1);
    expect(res.body.avgWatchTime).toBe(45);
    expect(res.body.engagementRate).toBe(1);
  });

  // 9. Retention cohorts
  it("should return retention cohorts", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      timestamp: "2025-01-15T10:00:00Z",
    });
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      timestamp: "2025-02-15T10:00:00Z",
    });
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-2",
      timestamp: "2025-01-20T10:00:00Z",
    });

    const res = await request(app).get("/analytics/retention?period=monthly");
    expect(res.status).toBe(200);
    expect(res.body.cohorts).toBeDefined();
    expect(res.body.cohorts.length).toBeGreaterThanOrEqual(1);

    const janCohort = res.body.cohorts.find(
      (c: { period: string }) => c.period === "2025-01-01"
    );
    expect(janCohort).toBeDefined();
    expect(janCohort.users).toBe(2);
    expect(janCohort.retained).toBe(1);
    expect(janCohort.rate).toBe(0.5);
  });

  // 10. Batch validation rejects empty array
  it("should reject batch with empty events array", async () => {
    const res = await request(app)
      .post("/analytics/events/batch")
      .send({ events: [] });
    expect(res.status).toBe(400);
  });
});
