import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import app from "../index";
import { _resetStores } from "../services/talentService";

beforeEach(() => {
  _resetStores();
});

const projectId = uuidv4();
const reviewerId = uuidv4();

const sampleProfile = {
  name: "Alex Chen",
  skills: ["3D Modeling", "Rigging", "Animation"],
  portfolio: ["https://portfolio.example.com/alex/piece1"],
  rates: { hourly: 75, daily: 500 },
  availability: "available" as const,
};

async function createProfile(overrides = {}) {
  return request(app)
    .post("/talent/profiles")
    .send({ ...sampleProfile, ...overrides });
}

describe("Talent Manager API", () => {
  test("POST /talent/profiles — create talent profile", async () => {
    const res = await createProfile();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Alex Chen",
      skills: ["3D Modeling", "Rigging", "Animation"],
      availability: "available",
      averageRating: 0,
    });
    expect(res.body.id).toBeDefined();
  });

  test("GET /talent/profiles — search by skill", async () => {
    await createProfile();
    await createProfile({ name: "Sam Lee", skills: ["Texturing", "Lighting"] });

    const res = await request(app).get("/talent/profiles?skill=rigging");
    expect(res.status).toBe(200);
    expect(res.body.profiles).toHaveLength(1);
    expect(res.body.profiles[0].name).toBe("Alex Chen");
  });

  test("POST /talent/bookings — book talent for project", async () => {
    const profile = await createProfile();
    const res = await request(app)
      .post("/talent/bookings")
      .send({
        talentId: profile.body.id,
        projectId,
        scope: "Character rigging for 3 models",
        dates: { start: "2026-04-01", end: "2026-04-15" },
        rate: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.talentId).toBe(profile.body.id);
  });

  test("PUT /talent/bookings/:id/status — accept booking updates availability", async () => {
    const profile = await createProfile();
    const booking = await request(app)
      .post("/talent/bookings")
      .send({
        talentId: profile.body.id,
        projectId,
        scope: "Animation work",
        dates: { start: "2026-04-01", end: "2026-04-15" },
        rate: 750,
      });

    const res = await request(app)
      .put(`/talent/bookings/${booking.body.id}/status`)
      .send({ status: "accepted" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");

    // Verify talent is now busy
    const talentRes = await request(app).get(`/talent/profiles/${profile.body.id}`);
    expect(talentRes.body.availability).toBe("busy");
  });

  test("POST /talent/profiles/:id/review — review talent updates rating", async () => {
    const profile = await createProfile();
    const res = await request(app)
      .post(`/talent/profiles/${profile.body.id}/review`)
      .send({ rating: 5, comment: "Exceptional rigging work!", reviewerId });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);

    // Verify average rating updated
    const talentRes = await request(app).get(`/talent/profiles/${profile.body.id}`);
    expect(talentRes.body.averageRating).toBe(5);
    expect(talentRes.body.reviewCount).toBe(1);
  });

  test("GET /talent/bookings/:projectId — get project bookings", async () => {
    const profile = await createProfile();
    await request(app)
      .post("/talent/bookings")
      .send({
        talentId: profile.body.id,
        projectId,
        scope: "Modeling work",
        dates: { start: "2026-04-01", end: "2026-04-10" },
        rate: 600,
      });

    const res = await request(app).get(`/talent/bookings/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0].projectId).toBe(projectId);
  });
});
