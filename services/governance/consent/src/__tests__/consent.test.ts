import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearStore } from "../services/consentService";

describe("Consent Service", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("POST /api/v1/rights/consent", () => {
    it("should grant consent and return consent_id", async () => {
      const response = await request(app)
        .post("/api/v1/rights/consent")
        .send({
          subject_id: "character-001",
          granted_by: "user-123",
          consent_type: "likeness",
          scope: ["animation", "rendering"],
          expires_at: "2027-01-01T00:00:00Z",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("consent_id");
      expect(response.body.status).toBe("active");
    });

    it("should reject invalid input", async () => {
      const response = await request(app)
        .post("/api/v1/rights/consent")
        .send({ subject_id: "" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/v1/rights/consent/:subjectId", () => {
    it("should return consent records for a subject", async () => {
      await request(app)
        .post("/api/v1/rights/consent")
        .send({
          subject_id: "character-002",
          granted_by: "user-456",
          consent_type: "voice",
          scope: ["synthesis"],
          expires_at: null,
        });

      const response = await request(app).get("/api/v1/rights/consent/character-002");

      expect(response.status).toBe(200);
      expect(response.body.subject_id).toBe("character-002");
      expect(response.body.consents).toHaveLength(1);
      expect(response.body.consents[0].consent_type).toBe("voice");
    });

    it("should return empty array for unknown subject", async () => {
      const response = await request(app).get("/api/v1/rights/consent/unknown");

      expect(response.status).toBe(200);
      expect(response.body.consents).toHaveLength(0);
    });
  });

  describe("DELETE /api/v1/rights/consent/:id", () => {
    it("should revoke an existing consent", async () => {
      const createRes = await request(app)
        .post("/api/v1/rights/consent")
        .send({
          subject_id: "character-003",
          granted_by: "user-789",
          consent_type: "likeness",
          scope: ["animation"],
          expires_at: null,
        });

      const deleteRes = await request(app)
        .delete(`/api/v1/rights/consent/${createRes.body.consent_id}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.status).toBe("revoked");
    });

    it("should return 404 for unknown consent id", async () => {
      const response = await request(app)
        .delete("/api/v1/rights/consent/nonexistent-id");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /governance/consent/validate", () => {
    it("should return valid when all consents exist", async () => {
      await request(app)
        .post("/api/v1/rights/consent")
        .send({
          subject_id: "char-A",
          granted_by: "user-1",
          consent_type: "likeness",
          scope: ["animation"],
          expires_at: "2027-12-31T23:59:59Z",
        });

      const response = await request(app)
        .post("/governance/consent/validate")
        .send({
          character_refs: ["char-A"],
          consent_types_needed: ["likeness"],
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.missing_consents).toHaveLength(0);
    });

    it("should return missing consents when not all granted", async () => {
      const response = await request(app)
        .post("/governance/consent/validate")
        .send({
          character_refs: ["char-B", "char-C"],
          consent_types_needed: ["likeness", "voice"],
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.missing_consents).toHaveLength(4);
    });

    it("should reject invalid input", async () => {
      const response = await request(app)
        .post("/governance/consent/validate")
        .send({ character_refs: [] });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok", service: "consent" });
    });
  });
});
