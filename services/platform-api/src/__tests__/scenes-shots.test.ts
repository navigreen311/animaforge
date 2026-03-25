import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { sceneService } from "../services/sceneService.js";
import { shotService } from "../services/shotService.js";
import scenesRouter from "../routes/scenes.js";
import shotsRouter from "../routes/shots.js";
import { errorHandler } from "../middleware/errorHandler.js";

// Build a self-contained app with scenes & shots routes (index.ts is managed by another agent)
const app = express();
app.use(express.json());
app.use("/api/v1", scenesRouter);
app.use("/api/v1", shotsRouter);
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

const VALID_SCENE_GRAPH = {
  subject: "Hero character",
  camera: { angle: "low", movement: "dolly-in", focal_length: "35mm" },
  action: "walking forward",
  emotion: "determined",
  timing: { duration_ms: 3000, pacing: "slow" },
  dialogue: "Let's go.",
};

const VALID_SHOT_BODY = {
  sceneGraph: VALID_SCENE_GRAPH,
  prompt: "A hero walks toward the camera in a misty forest",
  styleRef: "cinematic-dark",
  characterRefs: ["char-001", "char-002"],
  durationMs: 3000,
  aspectRatio: "16:9",
};

describe("Scenes CRUD", () => {
  beforeEach(() => {
    sceneService._clear();
    shotService._clear();
  });

  it("POST /api/v1/projects/:projectId/scenes — creates a scene", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/scenes`)
      .set(AUTH)
      .send({ title: "Opening", order: 0 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Opening");
    expect(res.body.data.projectId).toBe(PROJECT_ID);
    expect(res.body.data.id).toBeDefined();
  });

  it("GET /api/v1/projects/:projectId/scenes — lists scenes sorted by order", async () => {
    sceneService.create(PROJECT_ID, { title: "Scene B", order: 2 });
    sceneService.create(PROJECT_ID, { title: "Scene A", order: 1 });

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/scenes`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe("Scene A");
    expect(res.body.data[1].title).toBe("Scene B");
  });

  it("PUT /api/v1/scenes/:id — updates a scene", async () => {
    const scene = sceneService.create(PROJECT_ID, { title: "Draft", order: 0 });

    const res = await request(app)
      .put(`/api/v1/scenes/${scene.id}`)
      .set(AUTH)
      .send({ title: "Final" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Final");
  });

  it("DELETE /api/v1/scenes/:id — deletes a scene", async () => {
    const scene = sceneService.create(PROJECT_ID, { title: "To Remove", order: 0 });

    const res = await request(app)
      .delete(`/api/v1/scenes/${scene.id}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(sceneService.getById(scene.id)).toBeUndefined();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/scenes`);

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid scene body", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/scenes`)
      .set(AUTH)
      .send({ title: "", order: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("Shots CRUD", () => {
  let sceneId: string;

  beforeEach(() => {
    sceneService._clear();
    shotService._clear();
    const scene = sceneService.create(PROJECT_ID, { title: "Test Scene", order: 0 });
    sceneId = scene.id;
  });

  it("POST /api/v1/scenes/:sceneId/shots — creates a shot with scene graph", async () => {
    const res = await request(app)
      .post(`/api/v1/scenes/${sceneId}/shots`)
      .set(AUTH)
      .send(VALID_SHOT_BODY);

    expect(res.status).toBe(201);
    expect(res.body.data.sceneGraph.subject).toBe("Hero character");
    expect(res.body.data.sceneGraph.camera.angle).toBe("low");
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.sceneId).toBe(sceneId);
  });

  it("GET /api/v1/projects/:projectId/shots — lists all shots for a project", async () => {
    shotService.create(sceneId, PROJECT_ID, {
      ...VALID_SHOT_BODY,
      sceneGraph: VALID_SCENE_GRAPH,
    } as any);

    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/shots`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/shots/:id — returns a single shot", async () => {
    const shot = shotService.create(sceneId, PROJECT_ID, {
      ...VALID_SHOT_BODY,
      sceneGraph: VALID_SCENE_GRAPH,
    } as any);

    const res = await request(app)
      .get(`/api/v1/shots/${shot.id}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(shot.id);
  });

  it("PUT /api/v1/shots/:id — updates a shot", async () => {
    const shot = shotService.create(sceneId, PROJECT_ID, {
      ...VALID_SHOT_BODY,
      sceneGraph: VALID_SCENE_GRAPH,
    } as any);

    const res = await request(app)
      .put(`/api/v1/shots/${shot.id}`)
      .set(AUTH)
      .send({ prompt: "Updated prompt" });

    expect(res.status).toBe(200);
    expect(res.body.data.prompt).toBe("Updated prompt");
  });

  it("DELETE /api/v1/shots/:id — deletes a shot", async () => {
    const shot = shotService.create(sceneId, PROJECT_ID, {
      ...VALID_SHOT_BODY,
      sceneGraph: VALID_SCENE_GRAPH,
    } as any);

    const res = await request(app)
      .delete(`/api/v1/shots/${shot.id}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("rejects invalid scene graph — missing required fields", async () => {
    const res = await request(app)
      .post(`/api/v1/scenes/${sceneId}/shots`)
      .set(AUTH)
      .send({
        ...VALID_SHOT_BODY,
        sceneGraph: { subject: "test" }, // missing camera, action, emotion, timing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("Shot Approval & Lock Flow", () => {
  let sceneId: string;
  let shotId: string;

  beforeEach(() => {
    sceneService._clear();
    shotService._clear();
    const scene = sceneService.create(PROJECT_ID, { title: "Approval Scene", order: 0 });
    sceneId = scene.id;
    const shot = shotService.create(sceneId, PROJECT_ID, {
      ...VALID_SHOT_BODY,
      sceneGraph: VALID_SCENE_GRAPH,
    } as any);
    shotId = shot.id;
  });

  it("PUT /api/v1/shots/:id/approve — sets approved status", async () => {
    const res = await request(app)
      .put(`/api/v1/shots/${shotId}/approve`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(res.body.data.approvedBy).toBe("user-1");
    expect(res.body.data.approvedAt).toBeDefined();
  });

  it("PUT /api/v1/shots/:id/lock — sets locked status", async () => {
    const res = await request(app)
      .put(`/api/v1/shots/${shotId}/lock`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("locked");
  });

  it("rejects updates to locked shots", async () => {
    shotService.lock(shotId);

    const res = await request(app)
      .put(`/api/v1/shots/${shotId}`)
      .set(AUTH)
      .send({ prompt: "should fail" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LOCKED");
  });

  it("rejects deletion of locked shots", async () => {
    shotService.lock(shotId);

    const res = await request(app)
      .delete(`/api/v1/shots/${shotId}`)
      .set(AUTH);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LOCKED");
  });
});
