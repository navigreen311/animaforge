import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearAll } from "../services/analyticsService";

describe("Analytics Service", () => {
  beforeEach(() => {
    clearAll();
  });

  it("should return health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("analytics");
  });

  it("should track an event", async () => {
    const res = await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { style: "anime", credits: 5, quality: 0.95 },
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe("generation");
  });

  it("should return project analytics", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { credits: 5, quality: 0.9 },
    });
    await request(app).post("/analytics/events").send({
      type: "job_complete",
      userId: "user-1",
      projectId: "proj-1",
      metadata: { credits: 3, quality: 0.8 },
    });

    const res = await request(app).get("/analytics/project/proj-1");
    expect(res.status).toBe(200);
    expect(res.body.generationCount).toBe(2);
    expect(res.body.averageQuality).toBe(0.85);
    expect(res.body.creditUsage).toBe(8);
  });

  it("should return user analytics", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      projectId: "proj-1",
    });
    await request(app).post("/analytics/events").send({
      type: "page_view",
      userId: "user-1",
      projectId: "proj-2",
    });

    const res = await request(app).get("/analytics/user/user-1");
    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBe(2);
    expect(res.body.projectCount).toBe(2);
    expect(res.body.eventTypes.generation).toBe(1);
    expect(res.body.eventTypes.page_view).toBe(1);
  });

  it("should return platform analytics", async () => {
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      metadata: { style: "anime" },
    });
    await request(app).post("/analytics/events").send({
      type: "job_complete",
      userId: "user-2",
      metadata: { style: "anime" },
    });
    await request(app).post("/analytics/events").send({
      type: "generation",
      userId: "user-1",
      metadata: { style: "realistic" },
    });

    const res = await request(app).get("/analytics/platform");
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(2);
    expect(res.body.totalJobs).toBe(3);
    expect(res.body.totalEvents).toBe(3);
    expect(res.body.popularStyles[0].style).toBe("anime");
    expect(res.body.popularStyles[0].count).toBe(2);
  });

  it("should reject events with missing required fields", async () => {
    const res = await request(app).post("/analytics/events").send({
      metadata: { style: "anime" },
    });
    expect(res.status).toBe(400);
  });
});
