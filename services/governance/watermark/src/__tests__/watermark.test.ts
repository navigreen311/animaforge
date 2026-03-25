import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearStore } from "../services/watermarkService";

describe("Watermark Service", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("POST /governance/watermark/embed", () => {
    it("should embed a watermark and return watermark_id and watermarked_url", async () => {
      const response = await request(app)
        .post("/governance/watermark/embed")
        .send({
          job_id: "job-001",
          output_url: "https://cdn.animaforge.com/output/video-001.mp4",
          watermark_data: { creator: "user-123", project: "proj-456" },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("watermark_id");
      expect(response.body).toHaveProperty("watermarked_url");
      expect(response.body.watermarked_url).toContain(response.body.watermark_id);
    });

    it("should reject invalid input", async () => {
      const response = await request(app)
        .post("/governance/watermark/embed")
        .send({ job_id: "" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /governance/watermark/detect", () => {
    it("should detect a previously embedded watermark", async () => {
      const embedRes = await request(app)
        .post("/governance/watermark/embed")
        .send({
          job_id: "job-002",
          output_url: "https://cdn.animaforge.com/output/video-002.mp4",
          watermark_data: { creator: "user-789" },
        });

      const detectRes = await request(app)
        .post("/governance/watermark/detect")
        .send({ content_url: embedRes.body.watermarked_url });

      expect(detectRes.status).toBe(200);
      expect(detectRes.body.detected).toBe(true);
      expect(detectRes.body.watermark_id).toBe(embedRes.body.watermark_id);
      expect(detectRes.body.confidence).toBeGreaterThan(0.9);
      expect(detectRes.body.metadata).toHaveProperty("job_id", "job-002");
    });

    it("should return not detected for unknown content", async () => {
      const response = await request(app)
        .post("/governance/watermark/detect")
        .send({ content_url: "https://cdn.animaforge.com/unknown/file.mp4" });

      expect(response.status).toBe(200);
      expect(response.body.detected).toBe(false);
      expect(response.body.watermark_id).toBeNull();
      expect(response.body.confidence).toBe(0.0);
    });

    it("should reject invalid input", async () => {
      const response = await request(app)
        .post("/governance/watermark/detect")
        .send({ content_url: "not-a-url" });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok", service: "watermark" });
    });
  });
});
