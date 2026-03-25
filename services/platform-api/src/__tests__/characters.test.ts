import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import charactersRouter from "../routes/characters.js";
import assetsRouter from "../routes/assets.js";
import { clearCharacters } from "../services/characterService.js";
import { clearAssets } from "../services/assetService.js";
import { errorHandler } from "../middleware/errorHandler.js";

const app = express();
app.use(express.json());
app.use("/api/v1", charactersRouter);
app.use("/api/v1", assetsRouter);
app.use(errorHandler);

const PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const validCharacter = {
  name: "Hero Alpha",
  projectId: PROJECT_ID,
  styleMode: "anime",
  isDigitalTwin: false,
  bodyParams: { height: 180, build: "athletic", skinTone: "fair" },
  hairParams: { style: "spiky", color: "blue", length: "short" },
  wardrobe: ["armor", "cape"],
  voiceId: "voice-001",
};

const validAsset = {
  projectId: PROJECT_ID,
  type: "image" as const,
  name: "Hero Splash Art",
  url: "https://cdn.animaforge.io/assets/hero-splash.png",
  metadata: { width: 1920, height: 1080 },
};

beforeEach(() => {
  clearCharacters();
  clearAssets();
});

// ─── CHARACTER TESTS ────────────────────────────────────────

describe("POST /api/v1/characters", () => {
  it("should create a character and return 201", async () => {
    const res = await request(app)
      .post("/api/v1/characters")
      .send(validCharacter);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: "Hero Alpha",
      styleMode: "anime",
      projectId: PROJECT_ID,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.rightsStatus).toBe("original");
  });

  it("should reject invalid styleMode", async () => {
    const res = await request(app)
      .post("/api/v1/characters")
      .send({ ...validCharacter, styleMode: "watercolor" });

    expect(res.status).toBe(500); // Zod error falls through to error handler
  });
});

describe("GET /api/v1/characters", () => {
  it("should list characters with pagination", async () => {
    await request(app).post("/api/v1/characters").send(validCharacter);
    await request(app)
      .post("/api/v1/characters")
      .send({ ...validCharacter, name: "Hero Beta" });

    const res = await request(app).get("/api/v1/characters");

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
  });

  it("should filter by projectId", async () => {
    await request(app).post("/api/v1/characters").send(validCharacter);

    const res = await request(app)
      .get("/api/v1/characters")
      .query({ projectId: "00000000-0000-0000-0000-000000000000" });

    expect(res.body.data.items).toHaveLength(0);
  });
});

describe("GET /api/v1/characters/:id", () => {
  it("should return a character by id", async () => {
    const createRes = await request(app)
      .post("/api/v1/characters")
      .send(validCharacter);
    const id = createRes.body.data.id;

    const res = await request(app).get(`/api/v1/characters/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it("should return 404 for nonexistent character", async () => {
    const res = await request(app).get(
      "/api/v1/characters/00000000-0000-0000-0000-000000000099"
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/v1/characters/:id", () => {
  it("should update a character", async () => {
    const createRes = await request(app)
      .post("/api/v1/characters")
      .send(validCharacter);
    const id = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/characters/${id}`)
      .send({ name: "Hero Alpha v2", styleMode: "cel" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Hero Alpha v2");
    expect(res.body.data.styleMode).toBe("cel");
  });
});

describe("POST /api/v1/characters/:id/twin", () => {
  it("should trigger digital twin and return job_id", async () => {
    const createRes = await request(app)
      .post("/api/v1/characters")
      .send(validCharacter);
    const id = createRes.body.data.id;

    const res = await request(app).post(`/api/v1/characters/${id}/twin`);

    expect(res.status).toBe(202);
    expect(res.body.data.job_id).toBeDefined();
  });
});

describe("DELETE /api/v1/characters/:id", () => {
  it("should delete a character", async () => {
    const createRes = await request(app)
      .post("/api/v1/characters")
      .send(validCharacter);
    const id = createRes.body.data.id;

    const delRes = await request(app).delete(`/api/v1/characters/${id}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get(`/api/v1/characters/${id}`);
    expect(getRes.status).toBe(404);
  });
});

// ─── ASSET TESTS ────────────────────────────────────────────

describe("POST /api/v1/assets", () => {
  it("should create an asset and return 201", async () => {
    const res = await request(app).post("/api/v1/assets").send(validAsset);

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Hero Splash Art");
    expect(res.body.data.type).toBe("image");
    expect(res.body.data.id).toBeDefined();
  });
});

describe("GET /api/v1/assets", () => {
  it("should list assets with pagination", async () => {
    await request(app).post("/api/v1/assets").send(validAsset);

    const res = await request(app).get("/api/v1/assets");

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });
});

describe("GET /api/v1/assets/search", () => {
  it("should search assets by name substring", async () => {
    await request(app).post("/api/v1/assets").send(validAsset);

    const res = await request(app)
      .get("/api/v1/assets/search")
      .query({ q: "splash" });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  it("should return 400 when q is missing", async () => {
    const res = await request(app).get("/api/v1/assets/search");

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/assets/:id", () => {
  it("should delete an asset", async () => {
    const createRes = await request(app)
      .post("/api/v1/assets")
      .send(validAsset);
    const id = createRes.body.data.id;

    const delRes = await request(app).delete(`/api/v1/assets/${id}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get(`/api/v1/assets/${id}`);
    expect(getRes.status).toBe(404);
  });
});
