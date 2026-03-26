import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import {
  _resetEconomicsStores,
  recordUsage,
  addSubscriptionRevenue,
  addCreditPurchaseRevenue,
  calculateRevShare,
} from "../services/economicsEngine";

beforeEach(() => {
  _resetEconomicsStores();
});

describe("Economics Engine", () => {
  // 1. Job cost estimation
  describe("POST /billing/economics/estimate", () => {
    it("should return cost breakdown for a video_preview job", async () => {
      const res = await request(app)
        .post("/billing/economics/estimate")
        .send({ jobType: "video_preview", tier: "pro" });

      expect(res.status).toBe(200);
      expect(res.body.credits).toBeGreaterThan(0);
      expect(res.body.breakdown).toHaveProperty("compute");
      expect(res.body.breakdown).toHaveProperty("storage");
      expect(res.body.breakdown).toHaveProperty("bandwidth");
      expect(res.body.breakdown).toHaveProperty("governance");
      expect(res.body.estimatedUSD).toBeGreaterThan(0);
    });

    it("should reject invalid job type", async () => {
      const res = await request(app)
        .post("/billing/economics/estimate")
        .send({ jobType: "invalid_type", tier: "pro" });

      expect(res.status).toBe(400);
    });

    it("should apply tier discount — enterprise cheaper than free", async () => {
      const freeRes = await request(app)
        .post("/billing/economics/estimate")
        .send({ jobType: "video_final", tier: "free", params: { durationSec: 30 } });

      const entRes = await request(app)
        .post("/billing/economics/estimate")
        .send({ jobType: "video_final", tier: "enterprise", params: { durationSec: 30 } });

      expect(freeRes.status).toBe(200);
      expect(entRes.status).toBe(200);
      expect(entRes.body.credits).toBeLessThan(freeRes.body.credits);
    });
  });

  // 2. Project cost estimation
  describe("POST /billing/economics/project-estimate", () => {
    it("should return total cost for multiple shots", async () => {
      const res = await request(app)
        .post("/billing/economics/project-estimate")
        .send({
          projectId: "proj-1",
          shots: [
            { shotId: "shot-1", jobType: "video_preview", tier: "pro", params: {} },
            { shotId: "shot-2", jobType: "audio", tier: "pro", params: {} },
            { shotId: "shot-3", jobType: "avatar", tier: "pro", params: {} },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.projectId).toBe("proj-1");
      expect(res.body.shots).toHaveLength(3);
      expect(res.body.totalCredits).toBeGreaterThan(0);
      expect(res.body.totalEstimatedUSD).toBeGreaterThan(0);
    });
  });

  // 3. Usage report
  describe("GET /billing/economics/usage/:userId", () => {
    it("should return usage report with daily breakdown", async () => {
      // Seed some usage
      recordUsage("user-econ-1", "video_preview", "pro", 5);
      recordUsage("user-econ-1", "audio", "pro", 2);
      recordUsage("user-econ-1", "video_final", "pro", 10);

      const period = new Date().toISOString().slice(0, 7);
      const res = await request(app).get(
        `/billing/economics/usage/user-econ-1?period=${period}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.totalCredits).toBe(17);
      expect(res.body.byJobType).toHaveProperty("video_preview", 5);
      expect(res.body.byJobType).toHaveProperty("audio", 2);
      expect(res.body.dailyUsage).toBeInstanceOf(Array);
      expect(res.body.projectedMonthly).toBeGreaterThan(0);
    });
  });

  // 4. Cost optimization suggestions
  describe("GET /billing/economics/optimize/:userId", () => {
    it("should return at least one suggestion", async () => {
      const res = await request(app).get("/billing/economics/optimize/user-econ-2");

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeInstanceOf(Array);
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.suggestions[0]).toHaveProperty("message");
      expect(res.body.suggestions[0]).toHaveProperty("estimatedSavingsPercent");
    });

    it("should suggest preview iteration when many final renders exist", async () => {
      // Seed heavy final render usage
      for (let i = 0; i < 5; i++) {
        recordUsage("user-econ-3", "video_final", "pro", 10);
      }

      const res = await request(app).get("/billing/economics/optimize/user-econ-3");

      expect(res.status).toBe(200);
      const previewSuggestion = res.body.suggestions.find(
        (s: { type: string }) => s.type === "preview_iteration",
      );
      expect(previewSuggestion).toBeDefined();
      expect(previewSuggestion.estimatedSavingsPercent).toBe(40);
    });
  });

  // 5. Revenue share calculation
  describe("Revenue Share", () => {
    it("should split revenue 70/30 between creator and platform", () => {
      const result = calculateRevShare("creator-1", [
        { saleId: "s1", amount: 100, date: "2026-03-01" },
        { saleId: "s2", amount: 50, date: "2026-03-15" },
      ]);

      expect(result.grossRevenue).toBe(150);
      expect(result.platformFee).toBe(45);
      expect(result.creatorShare).toBe(105);
      expect(result.pendingPayout).toBe(105);
    });
  });

  // 6. Payout processing
  describe("POST /billing/economics/payout", () => {
    it("should create a payout with processing status", async () => {
      const res = await request(app)
        .post("/billing/economics/payout")
        .send({ creatorId: "creator-2", amount: 50 });

      expect(res.status).toBe(201);
      expect(res.body.payoutId).toBeDefined();
      expect(res.body.amount).toBe(50);
      expect(res.body.status).toBe("processing");
      expect(res.body.estimatedArrival).toBeDefined();
    });
  });

  // 7. Payout history
  describe("GET /billing/economics/payouts/:creatorId", () => {
    it("should return payout history for creator", async () => {
      // Create payouts first
      await request(app)
        .post("/billing/economics/payout")
        .send({ creatorId: "creator-3", amount: 25 });
      await request(app)
        .post("/billing/economics/payout")
        .send({ creatorId: "creator-3", amount: 75 });

      const res = await request(app).get("/billing/economics/payouts/creator-3");

      expect(res.status).toBe(200);
      expect(res.body.payouts).toHaveLength(2);
      expect(res.body.payouts[0].creatorId).toBe("creator-3");
    });
  });

  // 8. Platform revenue
  describe("GET /billing/economics/platform-revenue", () => {
    it("should return aggregated platform revenue", async () => {
      addSubscriptionRevenue(1000);
      addCreditPurchaseRevenue(500);
      // Trigger marketplace fee via rev-share
      calculateRevShare("creator-x", [
        { saleId: "s1", amount: 200, date: "2026-03-01" },
      ]);

      const res = await request(app).get("/billing/economics/platform-revenue");

      expect(res.status).toBe(200);
      expect(res.body.subscriptionRevenue).toBe(1000);
      expect(res.body.creditPurchases).toBe(500);
      expect(res.body.marketplaceFees).toBe(60); // 30% of 200
      expect(res.body.totalRevenue).toBe(1560);
    });
  });
});
