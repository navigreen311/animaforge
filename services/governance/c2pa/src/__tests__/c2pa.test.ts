import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearStore } from "../services/c2paService";

const VALID_PAYLOAD = {
  job_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  project_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  shot_id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  model_id: "animaforge-diffusion-v2",
  input_hash: "sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  user_id: "d4e5f6a7-b8c9-0123-defa-234567890123",
  consent_ids: ["e5f6a7b8-c9d0-1234-efab-345678901234"],
  output_url: "https://storage.animaforge.ai/outputs/test-output.mp4",
};

describe("C2PA Signing Service", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("POST /governance/c2pa/sign", () => {
    it("should create and sign a manifest", async () => {
      const res = await request(app)
        .post("/governance/c2pa/sign")
        .send(VALID_PAYLOAD)
        .expect(201);

      expect(res.body).toHaveProperty("manifest");
      expect(res.body).toHaveProperty("signature");
      expect(res.body).toHaveProperty("manifest_url");
      expect(res.body).toHaveProperty("output_id");
      expect(res.body.signature).toMatch(/^mock-ecdsa-p256:/);
    });

    it("should return a valid C2PA manifest structure", async () => {
      const res = await request(app)
        .post("/governance/c2pa/sign")
        .send(VALID_PAYLOAD)
        .expect(201);

      const { manifest } = res.body;
      expect(manifest["@context"]).toBeInstanceOf(Array);
      expect(manifest["@context"]).toContain("https://c2pa.org/statements/1.0");
      expect(manifest["dc:title"]).toContain(VALID_PAYLOAD.job_id);
      expect(manifest["c2pa:claim"]).toBeDefined();
      expect(manifest["c2pa:claim"].claim_generator).toBe("AnimaForge/C2PA-Signing-Service");
      expect(manifest["c2pa:claim"].signature_type).toBe("ECDSA-P256");
      expect(manifest["c2pa:claim"].assertions).toBeInstanceOf(Array);
      expect(manifest["c2pa:claim"].assertions.length).toBeGreaterThanOrEqual(4);
      expect(manifest["animaforge:metadata"]).toBeDefined();
      expect(manifest["animaforge:metadata"].job_id).toBe(VALID_PAYLOAD.job_id);
      expect(manifest["animaforge:metadata"].model_id).toBe(VALID_PAYLOAD.model_id);
      expect(manifest["animaforge:metadata"].consent_ids).toEqual(VALID_PAYLOAD.consent_ids);
    });

    it("should reject invalid payloads", async () => {
      const res = await request(app)
        .post("/governance/c2pa/sign")
        .send({ job_id: "not-a-uuid" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("details");
    });
  });

  describe("GET /governance/c2pa/verify/:outputId", () => {
    it("should verify a signed manifest", async () => {
      const signRes = await request(app)
        .post("/governance/c2pa/sign")
        .send(VALID_PAYLOAD)
        .expect(201);

      const { output_id } = signRes.body;

      const verifyRes = await request(app)
        .get(`/governance/c2pa/verify/${output_id}`)
        .expect(200);

      expect(verifyRes.body.valid).toBe(true);
      expect(verifyRes.body.generator).toBe("AnimaForge/C2PA-Signing-Service");
      expect(verifyRes.body.created_at).toBeDefined();
      expect(verifyRes.body.model_id).toBe(VALID_PAYLOAD.model_id);
      expect(verifyRes.body.manifest).toBeDefined();
    });

    it("should return 404 for unknown output ID", async () => {
      const res = await request(app)
        .get("/governance/c2pa/verify/nonexistent-id")
        .expect(404);

      expect(res.body.error).toContain("not found");
    });
  });

  describe("GET /governance/c2pa/manifest/:jobId", () => {
    it("should retrieve a stored manifest by job ID", async () => {
      await request(app)
        .post("/governance/c2pa/sign")
        .send(VALID_PAYLOAD)
        .expect(201);

      const res = await request(app)
        .get(`/governance/c2pa/manifest/${VALID_PAYLOAD.job_id}`)
        .expect(200);

      expect(res.body.manifest).toBeDefined();
      expect(res.body.signature).toBeDefined();
      expect(res.body.output_id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
    });

    it("should return 404 for unknown job ID", async () => {
      const res = await request(app)
        .get("/governance/c2pa/manifest/00000000-0000-0000-0000-000000000000")
        .expect(404);

      expect(res.body.error).toContain("not found");
    });
  });

  describe("Health check", () => {
    it("should respond on /health", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("c2pa-signing");
    });
  });
});
