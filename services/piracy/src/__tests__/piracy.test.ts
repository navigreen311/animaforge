import { afterEach, describe, expect, test } from "vitest";
import request from "supertest";
import { app } from "../index";
import { clearStore } from "../services/piracyService";

afterEach(() => {
  clearStore();
});

describe("Piracy Monitoring Service", () => {
  test("POST /piracy/register — registers content for monitoring", async () => {
    const res = await request(app)
      .post("/piracy/register")
      .send({
        outputId: "out-1",
        watermarkId: "wm-1",
        metadata: { title: "Test Animation" },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.outputId).toBe("out-1");
    expect(res.body.watermarkId).toBe("wm-1");
    expect(res.body.metadata.title).toBe("Test Animation");
  });

  test("POST /piracy/register — says so when no asset was fingerprinted", async () => {
    const res = await request(app)
      .post("/piracy/register")
      .send({ outputId: "out-nofp", watermarkId: "wm-nofp" });

    expect(res.status).toBe(201);
    expect(res.body.fingerprinted).toBe(false);
    expect(res.body.warning).toMatch(/cannot be matched/i);
  });

  test("POST /piracy/scan — scans platforms for unauthorized content", async () => {
    const res = await request(app)
      .post("/piracy/scan")
      .send({ query: "test animation", platforms: ["youtube", "tiktok"] });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe("test animation");
    expect(res.body.platforms).toEqual(["youtube", "tiktok"]);
    expect(res.body).toHaveProperty("total_matches");
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  test("POST /piracy/scan — reports degraded when discovery is not configured", async () => {
    const res = await request(app)
      .post("/piracy/scan")
      .send({ query: "test animation", platforms: ["youtube"] });

    // With no search provider there is nothing to examine, and the scan must
    // say so rather than returning fabricated matches.
    expect(res.status).toBe(200);
    expect(res.body.total_matches).toBe(0);
    expect(res.body.candidates_examined).toBe(0);
    expect(res.body.degraded).toBe(true);
    expect(res.body.reasons.join(" ")).toMatch(/PIRACY_SEARCH_PROVIDER/);
  });

  test("GET /piracy/alerts — lists piracy alerts", async () => {
    await request(app)
      .post("/piracy/scan")
      .send({ query: "test", platforms: ["youtube"] });

    const res = await request(app).get("/piracy/alerts");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("alerts");
    expect(res.body).toHaveProperty("count");
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });

  test("POST /piracy/scan — rejects invalid request", async () => {
    const res = await request(app).post("/piracy/scan").send({ query: "test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("platforms");
  });

  test("POST /piracy/match — rejects a request with no asset", async () => {
    const res = await request(app).post("/piracy/match").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/asset_base64/);
  });

  test("GET /piracy/dashboard — returns monitoring stats", async () => {
    await request(app)
      .post("/piracy/register")
      .send({ outputId: "out-1", watermarkId: "wm-1" });

    await request(app)
      .post("/piracy/scan")
      .send({ query: "test", platforms: ["youtube"] });

    const res = await request(app).get("/piracy/dashboard");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_registered", 1);
    expect(res.body).toHaveProperty("total_scans", 1);
    expect(res.body).toHaveProperty("matches_found");
    expect(res.body).toHaveProperty("dmca_sent");
    expect(res.body).toHaveProperty("takedown_rate");
  });

  test("PUT /piracy/alerts/:id/action — rejects invalid action", async () => {
    const res = await request(app)
      .put("/piracy/alerts/fake-id/action")
      .send({ action: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("action must be");
  });

  test("GET /piracy/capabilities — reports the true state of each dependency", async () => {
    const res = await request(app).get("/piracy/capabilities");

    expect(res.status).toBe(200);
    expect(res.body.fingerprinting.image_fingerprinting.available).toBe(true);
    expect(res.body.discovery.configured).toBe(false);
    expect(typeof res.body.degraded).toBe("boolean");
    expect(Array.isArray(res.body.degraded_reasons)).toBe(true);
  });
});
