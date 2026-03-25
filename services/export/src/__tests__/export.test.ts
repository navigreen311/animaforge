import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440001";

describe("Export Engine", () => {
  it("POST /export/video - creates a video export job", async () => {
    const res = await request(app).post("/export/video").send({
      projectId: VALID_UUID, shotIds: [VALID_UUID, VALID_UUID_2],
      format: "mp4", codec: "h264", resolution: "1080p", fps: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("video");
    expect(res.body.status).toBe("completed");
    expect(res.body.outputUrl).toContain(".mp4");
    expect(res.body.fileSize).toBeGreaterThan(0);
  });

  it("POST /export/video - rejects incompatible codec/format", async () => {
    const res = await request(app).post("/export/video").send({
      projectId: VALID_UUID, shotIds: [VALID_UUID],
      format: "webm", codec: "h264", resolution: "1080p", fps: 24,
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("not compatible");
  });

  it("POST /export/video - rejects invalid input", async () => {
    const res = await request(app).post("/export/video").send({
      projectId: "not-a-uuid", shotIds: [], format: "avi", codec: "divx", resolution: "8k", fps: 120,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("POST /export/audio - creates an audio export job", async () => {
    const res = await request(app).post("/export/audio").send({
      projectId: VALID_UUID, shotIds: [VALID_UUID], format: "wav",
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("audio");
    expect(res.body.status).toBe("completed");
    expect(res.body.outputUrl).toContain(".wav");
  });

  it("POST /export/audio - rejects invalid format", async () => {
    const res = await request(app).post("/export/audio").send({
      projectId: VALID_UUID, shotIds: [VALID_UUID], format: "flac",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("POST /export/project - creates a project export with assets", async () => {
    const res = await request(app).post("/export/project").send({
      projectId: VALID_UUID, format: "mp4", includeAssets: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("project");
    expect(res.body.status).toBe("completed");
    expect(res.body.outputUrl).toContain("project.zip");
    expect(res.body.fileSize).toBe(250000);
  });

  it("POST /export/project - creates a project export without assets", async () => {
    const res = await request(app).post("/export/project").send({
      projectId: VALID_UUID, format: "webm", includeAssets: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.fileSize).toBe(50000);
  });

  it("POST /export/avatar - creates an avatar export", async () => {
    const res = await request(app).post("/export/avatar").send({
      characterId: VALID_UUID, format: "gltf",
    });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("avatar");
    expect(res.body.status).toBe("completed");
    expect(res.body.outputUrl).toContain(".gltf");
    expect(res.body.fileSize).toBe(15000);
  });

  it("GET /export/jobs/:id - retrieves a job by id", async () => {
    const createRes = await request(app).post("/export/audio").send({
      projectId: VALID_UUID, shotIds: [VALID_UUID], format: "opus",
    });
    const jobId = createRes.body.id;
    const res = await request(app).get("/export/jobs/" + jobId);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jobId);
    expect(res.body.type).toBe("audio");
  });

  it("GET /export/formats - lists all supported formats", async () => {
    const res = await request(app).get("/export/formats");
    expect(res.status).toBe(200);
    expect(res.body.formats).toBeInstanceOf(Array);
    expect(res.body.formats.length).toBeGreaterThanOrEqual(12);
    const categories = res.body.formats.map((f) => f.category);
    expect(categories).toContain("video");
    expect(categories).toContain("audio");
    expect(categories).toContain("3d");
  });
});
