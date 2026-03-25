import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { _resetStores } from "../services/billingService";

beforeEach(() => {
  _resetStores();
});

describe("Billing Service", () => {
  // ---------- Subscriptions ----------

  describe("POST /billing/subscribe", () => {
    it("should create a new subscription", async () => {
      const res = await request(app)
        .post("/billing/subscribe")
        .send({ userId: "user-1", tier: "pro" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        userId: "user-1",
        tier: "pro",
        status: "active",
      });
      expect(res.body.id).toBeDefined();
    });

    it("should reject duplicate subscription", async () => {
      await request(app).post("/billing/subscribe").send({ userId: "user-1", tier: "free" });
      const res = await request(app)
        .post("/billing/subscribe")
        .send({ userId: "user-1", tier: "pro" });

      expect(res.status).toBe(409);
    });

    it("should reject invalid tier", async () => {
      const res = await request(app)
        .post("/billing/subscribe")
        .send({ userId: "user-1", tier: "diamond" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /billing/subscription/:userId", () => {
    it("should return 404 for unknown user", async () => {
      const res = await request(app).get("/billing/subscription/unknown");
      expect(res.status).toBe(404);
    });

    it("should return subscription for subscribed user", async () => {
      await request(app).post("/billing/subscribe").send({ userId: "user-2", tier: "starter" });
      const res = await request(app).get("/billing/subscription/user-2");

      expect(res.status).toBe(200);
      expect(res.body.tier).toBe("starter");
    });
  });

  describe("PUT /billing/subscription/:userId", () => {
    it("should update subscription tier", async () => {
      await request(app).post("/billing/subscribe").send({ userId: "user-3", tier: "free" });
      const res = await request(app)
        .put("/billing/subscription/user-3")
        .send({ tier: "enterprise" });

      expect(res.status).toBe(200);
      expect(res.body.tier).toBe("enterprise");
    });
  });

  describe("DELETE /billing/subscription/:userId", () => {
    it("should cancel subscription", async () => {
      await request(app).post("/billing/subscribe").send({ userId: "user-4", tier: "pro" });
      const res = await request(app).delete("/billing/subscription/user-4");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });
  });

  // ---------- Credits ----------

  describe("POST /billing/credits/topup", () => {
    it("should add credits to user balance", async () => {
      const res = await request(app)
        .post("/billing/credits/topup")
        .send({ userId: "user-5", amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(100);
    });
  });

  describe("POST /billing/credits/deduct", () => {
    it("should deduct correct cost for video_10s_final", async () => {
      await request(app).post("/billing/credits/topup").send({ userId: "user-6", amount: 50 });

      const res = await request(app)
        .post("/billing/credits/deduct")
        .send({ userId: "user-6", jobType: "video_10s_final", tier: "pro" });

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(45);
      expect(res.body.usageThisPeriod).toBe(5);
    });

    it("should reject deduction when insufficient credits", async () => {
      await request(app).post("/billing/credits/topup").send({ userId: "user-7", amount: 1 });

      const res = await request(app)
        .post("/billing/credits/deduct")
        .send({ userId: "user-7", jobType: "avatar_reconstruction", tier: "pro" });

      expect(res.status).toBe(402);
      expect(res.body.error).toBe("Insufficient credits");
    });

    it("should deduct fractional cost for img_to_cartoon", async () => {
      await request(app).post("/billing/credits/topup").send({ userId: "user-8", amount: 10 });

      const res = await request(app)
        .post("/billing/credits/deduct")
        .send({ userId: "user-8", jobType: "img_to_cartoon", tier: "free" });

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(9.5);
    });
  });

  describe("GET /billing/credits/:userId", () => {
    it("should return zero balance for unknown user", async () => {
      const res = await request(app).get("/billing/credits/unknown");
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(0);
    });

    it("should reflect balance after topup and deduction", async () => {
      await request(app).post("/billing/credits/topup").send({ userId: "user-9", amount: 20 });
      await request(app)
        .post("/billing/credits/deduct")
        .send({ userId: "user-9", jobType: "music_30s", tier: "starter" });

      const res = await request(app).get("/billing/credits/user-9");
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(18);
      expect(res.body.usageThisPeriod).toBe(2);
    });
  });

  // ---------- Webhook ----------

  describe("POST /billing/webhook", () => {
    it("should acknowledge valid webhook", async () => {
      const res = await request(app)
        .post("/billing/webhook")
        .send({ type: "payment_intent.succeeded", data: { id: "pi_123" } });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });
});
