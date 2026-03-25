import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import socialRouter from "../routes/social.js";
import repurposeRouter from "../routes/repurpose.js";
import { errorHandler } from "../middleware/errorHandler.js";
import * as socialService from "../services/socialService.js";

const app = express();
app.use(express.json());
app.use("/api/v1", socialRouter);
app.use("/api/v1", repurposeRouter);
app.use(errorHandler);

function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "editor");
const AUTH = { Authorization: `Bearer ${TOKEN}` };

describe("Social Publishing (F4)", () => {
  beforeEach(() => {
    socialService.resetStores();
  });

  it("POST /api/v1/social/connect — connects a platform", async () => {
    const res = await request(app)
      .post("/api/v1/social/connect")
      .set(AUTH)
      .send({ platform: "youtube", credentials: { accessToken: "yt-token-123" } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platform).toBe("youtube");
    expect(res.body.data.status).toBe("connected");
    expect(res.body.data.id).toBeDefined();
  });

  it("POST /api/v1/social/connect — rejects unsupported platform", async () => {
    const res = await request(app)
      .post("/api/v1/social/connect")
      .set(AUTH)
      .send({ platform: "myspace", credentials: { token: "x" } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_PLATFORM");
  });

  it("GET /api/v1/social/connections — lists connected platforms", async () => {
    socialService.connectPlatform("user-1", "youtube", { accessToken: "yt" });
    socialService.connectPlatform("user-1", "tiktok", { accessToken: "tt" });

    const res = await request(app)
      .get("/api/v1/social/connections")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((c: { platform: string }) => c.platform).sort()).toEqual(["tiktok", "youtube"]);
  });

  it("DELETE /api/v1/social/disconnect — disconnects a platform", async () => {
    socialService.connectPlatform("user-1", "instagram", { accessToken: "ig" });

    const res = await request(app)
      .delete("/api/v1/social/disconnect")
      .set(AUTH)
      .send({ platform: "instagram" });

    expect(res.status).toBe(200);
    expect(res.body.data.disconnected).toBe(true);

    const conns = socialService.getConnections("user-1");
    expect(conns).toHaveLength(0);
  });

  it("POST /api/v1/social/publish — publishes to YouTube", async () => {
    const res = await request(app)
      .post("/api/v1/social/publish")
      .set(AUTH)
      .send({
        platform: "youtube",
        videoUrl: "https://cdn.animaforge.io/videos/test.mp4",
        metadata: { title: "My Animation", description: "A test video" },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.platform).toBe("youtube");
    expect(res.body.data.externalUrl).toContain("youtube.com");
    expect(res.body.data.status).toBe("published");
  });

  it("POST /api/v1/social/schedule — schedules publications", async () => {
    const res = await request(app)
      .post("/api/v1/social/schedule")
      .set(AUTH)
      .send({
        publications: [
          {
            platform: "tiktok",
            videoUrl: "https://cdn.animaforge.io/videos/clip.mp4",
            metadata: { caption: "Check this out" },
            scheduledAt: "2026-04-01T12:00:00Z",
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("scheduled");
    expect(res.body.data[0].scheduledAt).toBe("2026-04-01T12:00:00Z");
  });

  it("GET /api/v1/social/history — returns publication history", async () => {
    socialService.publishToYouTube("user-1", "https://cdn.animaforge.io/v1.mp4", { title: "V1" });
    socialService.publishToTikTok("user-1", "https://cdn.animaforge.io/v2.mp4", { title: "V2" });

    const res = await request(app)
      .get("/api/v1/social/history")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("Content Repurposing (F6)", () => {
  it("POST /api/v1/repurpose/platform — repurposes for TikTok", async () => {
    const res = await request(app)
      .post("/api/v1/repurpose/platform")
      .set(AUTH)
      .send({ videoUrl: "https://cdn.animaforge.io/videos/orig.mp4", targetPlatform: "tiktok" });

    expect(res.status).toBe(200);
    expect(res.body.data.aspectRatio).toBe("9:16");
    expect(res.body.data.resolution).toBe("1080x1920");
    expect(res.body.data.platform).toBe("tiktok");
    expect(res.body.data.outputUrl).toContain("repurposed/tiktok");
  });

  it("POST /api/v1/repurpose/thumbnails — generates thumbnails", async () => {
    const res = await request(app)
      .post("/api/v1/repurpose/thumbnails")
      .set(AUTH)
      .send({ videoUrl: "https://cdn.animaforge.io/videos/orig.mp4", count: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.thumbnails).toHaveLength(4);
    expect(res.body.data.thumbnails[0]).toHaveProperty("url");
    expect(res.body.data.thumbnails[0]).toHaveProperty("timestamp_ms");
  });

  it("POST /api/v1/repurpose/subtitles — generates subtitles", async () => {
    const res = await request(app)
      .post("/api/v1/repurpose/subtitles")
      .set(AUTH)
      .send({ videoUrl: "https://cdn.animaforge.io/videos/orig.mp4", language: "es" });

    expect(res.status).toBe(200);
    expect(res.body.data.srt).toContain("es");
    expect(res.body.data.vtt).toContain("WEBVTT");
    expect(res.body.data.burned_url).toContain("_es.mp4");
  });
});
