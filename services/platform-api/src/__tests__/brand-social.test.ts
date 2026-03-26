import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import socialRouter from "../routes/social.js";
import { errorHandler } from "../middleware/errorHandler.js";
import * as socialService from "../services/socialService.js";
import * as socialPublisher from "../services/socialPublisher.js";
import * as brandKitService from "../services/brandKitService.js";

const app = express();
app.use(express.json());
app.use("/api/v1", socialRouter);
app.use(errorHandler);

function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return header + "." + payload + "." + signature;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "editor");
const AUTH = { Authorization: "Bearer " + TOKEN };

const SAMPLE_BRAND_KIT = {
  colors: { primary: "#FF5733", secondary: "#33FF57", accent: "#3357FF", background: "#FFFFFF", text: "#000000" },
  logo: { url: "https://cdn.animaforge.io/logos/logo.png", placement: "top-left" as const, minSize: 48 },
  typography: { headingFont: "Inter", bodyFont: "Roboto", sizes: [{ label: "H1", value: 32 }] },
  sonic: { introUrl: "https://cdn.animaforge.io/audio/intro.mp3", outroUrl: "https://cdn.animaforge.io/audio/outro.mp3", transitionUrl: "" },
  watermark: { enabled: true, position: "bottom-right" as const, opacity: 0.3 },
  templates: [],
};

describe("Brand Kit + Social Publishing (F4)", () => {
  let brandKitId: string;

  beforeEach(async () => {
    socialService.resetStores();
    socialPublisher.resetPublisherStores();
    brandKitService.clearBrandKits();

    const kit = await brandKitService.createBrandKit("project-1", SAMPLE_BRAND_KIT);
    brandKitId = kit.id;
  });

  it("POST /api/v1/social/connect — connects via OAuth code exchange", async () => {
    const res = await request(app)
      .post("/api/v1/social/connect")
      .set(AUTH)
      .send({ platform: "youtube", credentials: { authCode: "oauth-code-123" } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platform).toBe("youtube");
    expect(res.body.data.status).toBe("connected");
  });

  it("POST /api/v1/social/publish-with-brand — publishes with brand kit applied", async () => {
    const res = await request(app)
      .post("/api/v1/social/publish-with-brand")
      .set(AUTH)
      .send({
        platform: "youtube",
        videoUrl: "https://cdn.animaforge.io/videos/test.mp4",
        brandKitId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.publishId).toBeDefined();
    expect(res.body.data.platformUrl).toContain("youtube.com");
    expect(res.body.data.publishedAt).toBeDefined();
    expect(res.body.data.brandOperations).toBeInstanceOf(Array);
    expect(res.body.data.brandOperations.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/social/schedule-multi — schedules to multiple platforms", async () => {
    const res = await request(app)
      .post("/api/v1/social/schedule-multi")
      .set(AUTH)
      .send({
        videoUrl: "https://cdn.animaforge.io/videos/clip.mp4",
        platforms: ["youtube", "tiktok", "instagram"],
        scheduleAt: "2026-04-15T14:00:00Z",
        brandKitId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.scheduleId).toBeDefined();
    expect(res.body.data.publications).toHaveLength(3);
    expect(res.body.data.publications.map((p: { platform: string }) => p.platform).sort())
      .toEqual(["instagram", "tiktok", "youtube"]);
  });

  it("GET /api/v1/social/calendar — returns publishing calendar for a month", async () => {
    socialService.publishToPlatform(
      "user-1",
      "youtube",
      "https://cdn.animaforge.io/videos/v1.mp4",
      { title: "March Video" },
    );

    const now = new Date();
    const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    const res = await request(app)
      .get("/api/v1/social/calendar")
      .set(AUTH)
      .query({ month });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty("date");
    expect(res.body.data[0]).toHaveProperty("platform");
  });

  it("GET /api/v1/social/performance/:publishId — returns performance metrics", async () => {
    const pubRes = await request(app)
      .post("/api/v1/social/publish-with-brand")
      .set(AUTH)
      .send({
        platform: "tiktok",
        videoUrl: "https://cdn.animaforge.io/videos/metrics.mp4",
        brandKitId,
      });

    const publishId = pubRes.body.data.publishId;

    const res = await request(app)
      .get("/api/v1/social/performance/" + publishId)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("views");
    expect(res.body.data).toHaveProperty("likes");
    expect(res.body.data).toHaveProperty("shares");
    expect(res.body.data).toHaveProperty("comments");
    expect(res.body.data).toHaveProperty("engagementRate");
  });

  it("GET /api/v1/social/performance/:publishId — returns 404 for unknown id", async () => {
    const res = await request(app)
      .get("/api/v1/social/performance/nonexistent-id")
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/social/cross-platform-report — aggregates metrics across platforms", async () => {
    socialService.publishToPlatform("user-1", "youtube", "https://cdn.animaforge.io/v1.mp4", {});
    socialService.publishToPlatform("user-1", "tiktok", "https://cdn.animaforge.io/v2.mp4", {});

    const now = new Date();
    const period = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    const res = await request(app)
      .get("/api/v1/social/cross-platform-report")
      .set(AUTH)
      .query({ period });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("period");
    expect(res.body.data).toHaveProperty("platforms");
    expect(res.body.data).toHaveProperty("totals");
    expect(res.body.data.platforms).toBeInstanceOf(Array);
  });

  it("DELETE /api/v1/social/disconnect — revokes platform access", async () => {
    socialService.connectPlatform("user-1", "vimeo", { accessToken: "vm-token" });

    const res = await request(app)
      .delete("/api/v1/social/disconnect")
      .set(AUTH)
      .send({ platform: "vimeo" });

    expect(res.status).toBe(200);
    expect(res.body.data.disconnected).toBe(true);

    const conns = socialService.getConnections("user-1");
    const vimeoConn = conns.find((c) => c.platform === "vimeo");
    expect(vimeoConn).toBeUndefined();
  });

  it("GET /api/v1/social/platforms — returns supported platforms with specs", async () => {
    const res = await request(app)
      .get("/api/v1/social/platforms")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(5);

    const youtube = res.body.data.find((p: { id: string }) => p.id === "youtube");
    expect(youtube).toBeDefined();
    expect(youtube.maxDuration).toBe(43200);
    expect(youtube.aspectRatios).toContain("16:9");

    const tiktok = res.body.data.find((p: { id: string }) => p.id === "tiktok");
    expect(tiktok.maxDuration).toBe(600);
    expect(tiktok.maxFileSize).toBe("4GB");
  });

  it("POST /api/v1/social/publish-with-brand — rejects unsupported platform", async () => {
    const res = await request(app)
      .post("/api/v1/social/publish-with-brand")
      .set(AUTH)
      .send({
        platform: "myspace",
        videoUrl: "https://cdn.animaforge.io/videos/test.mp4",
        brandKitId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_PLATFORM");
  });
});
