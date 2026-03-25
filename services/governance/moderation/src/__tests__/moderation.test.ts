import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { _resetLogStore } from "../services/moderationService";

beforeEach(() => {
  _resetLogStore();
});

describe("POST /governance/moderate/pre-check", () => {
  it("blocks a prompt containing violence keywords", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({ prompt: "a scene where characters kill and murder each other" });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.blocked_categories).toContain("violence");
  });

  it("blocks a prompt containing sexual keywords", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({ prompt: "generate an explicit nude image" });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.blocked_categories).toContain("sexual");
  });

  it("blocks a prompt containing impersonation keywords", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({ prompt: "deepfake a celebrity to impersonate them" });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.blocked_categories).toContain("impersonation");
  });

  it("blocks a prompt containing minors-related keywords", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({ prompt: "content involving child abuse" });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.blocked_categories).toContain("minors");
  });

  it("passes a safe prompt", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({ prompt: "a sunny meadow with flowers and butterflies" });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.reason_code).toBe("NONE");
    expect(res.body.blocked_categories).toEqual([]);
  });

  it("detects keywords in scene_graph", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({
        prompt: "animate a character",
        scene_graph: { action: "stab the villain with a weapon" },
      });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.blocked_categories).toContain("violence");
  });

  it("returns 400 for missing prompt", async () => {
    const res = await request(app)
      .post("/governance/moderate/pre-check")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /governance/moderate", () => {
  it("classifies safe content as pass", async () => {
    const res = await request(app).post("/governance/moderate").send({
      job_id: "job-001",
      content_url: "https://cdn.example.com/safe-landscape.png",
      content_type: "image",
    });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe("pass");
    expect(res.body.category).toBe("safe");
  });

  it("returns 400 for invalid content_type", async () => {
    const res = await request(app).post("/governance/moderate").send({
      job_id: "job-002",
      content_url: "https://cdn.example.com/file.bin",
      content_type: "binary",
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /governance/moderation-log/:jobId", () => {
  it("returns empty array for unknown job", async () => {
    const res = await request(app).get(
      "/governance/moderation-log/nonexistent"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns log records after moderation", async () => {
    await request(app).post("/governance/moderate").send({
      job_id: "job-log-1",
      content_url: "https://cdn.example.com/safe.png",
      content_type: "image",
    });

    const res = await request(app).get(
      "/governance/moderation-log/job-log-1"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].job_id).toBe("job-log-1");
  });
});
