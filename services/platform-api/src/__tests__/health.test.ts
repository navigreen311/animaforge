import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";

describe("GET /api/v1/health", () => {
  it("should return 200 with status ok", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("version", "0.1.0");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("should return a valid ISO timestamp", async () => {
    const res = await request(app).get("/api/v1/health");

    const timestamp = new Date(res.body.timestamp);
    expect(timestamp.toISOString()).toBe(res.body.timestamp);
  });
});
