import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import checkoutRouter from "../routes/checkout";
import { stripeWebhookMiddleware, StripeWebhookRequest } from "../middleware/stripeWebhook";
import * as stripeService from "../services/stripeService";
import { PRICING } from "../services/stripeService";

// --------------- App setup ---------------

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/billing", checkoutRouter);

  // Webhook route with middleware
  app.post(
    "/billing/stripe-webhook",
    stripeWebhookMiddleware,
    (req: StripeWebhookRequest, res) => {
      if (!req.stripeEvent) {
        res.status(400).json({ error: "No event" });
        return;
      }
      const result = stripeService.handleWebhookEvent(req.stripeEvent);
      res.json(result);
    },
  );

  return app;
}

// --------------- Tests ---------------

describe("Stripe Billing Integration", () => {
  let app: express.Express;

  beforeEach(() => {
    stripeService._resetStores();
    app = createApp();
  });

  // 1. Checkout session creation
  describe("POST /billing/checkout", () => {
    it("should create a checkout session for a valid tier", async () => {
      const res = await request(app)
        .post("/billing/checkout")
        .send({ tier: "pro", userId: "user-1" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toContain("checkout.stripe.com");
      expect(res.body.tier).toBe("pro");
      expect(res.body.priceId).toBe("price_pro_049");
    });

    it("should reject an invalid tier", async () => {
      const res = await request(app)
        .post("/billing/checkout")
        .send({ tier: "ultra-mega", userId: "user-1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid tier");
    });

    it("should reject when tier is missing", async () => {
      const res = await request(app)
        .post("/billing/checkout")
        .send({ userId: "user-1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("tier is required");
    });
  });

  // 2. Portal session
  describe("POST /billing/portal", () => {
    it("should create a portal session for an existing customer", async () => {
      // First, create a customer
      stripeService.createCustomer("user-portal", "portal@animaforge.app");

      const res = await request(app)
        .post("/billing/portal")
        .send({ userId: "user-portal" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toContain("billing.stripe.com");
    });

    it("should return 404 when customer does not exist", async () => {
      const res = await request(app)
        .post("/billing/portal")
        .send({ userId: "nonexistent-user" });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("No billing customer");
    });
  });

  // 3. Plan listing
  describe("GET /billing/plans", () => {
    it("should list all available plans with pricing", async () => {
      const res = await request(app).get("/billing/plans");

      expect(res.status).toBe(200);
      expect(res.body.plans).toHaveLength(4);

      const pro = res.body.plans.find(
        (p: { tier: string }) => p.tier === "pro",
      );
      expect(pro).toBeDefined();
      expect(pro.priceMonthly).toBe(4900);
      expect(pro.priceDisplay).toBe("$49/mo");
      expect(pro.credits).toBe(300);
    });

    it("should include free tier at $0", async () => {
      const res = await request(app).get("/billing/plans");

      const free = res.body.plans.find(
        (p: { tier: string }) => p.tier === "free",
      );
      expect(free).toBeDefined();
      expect(free.priceMonthly).toBe(0);
      expect(free.priceDisplay).toBe("$0/mo");
    });
  });

  // 4. Webhook: checkout.session.completed (subscription created)
  describe("Webhook: checkout.session.completed", () => {
    it("should create a subscription and allocate credits", async () => {
      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_1",
          type: "checkout.session.completed",
          data: {
            object: {
              client_reference_id: "user-checkout",
              customer_email: "checkout@animaforge.app",
              metadata: { tier: "creator" },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.action).toBe("subscription_created");

      // Verify customer was created
      const customer = stripeService.getCustomerByUserId("user-checkout");
      expect(customer).toBeDefined();
      expect(customer!.email).toBe("checkout@animaforge.app");

      // Verify subscription exists
      const sub = stripeService.getSubscriptionByCustomer(customer!.id);
      expect(sub).toBeDefined();
      expect(sub!.tier).toBe("creator");
      expect(sub!.status).toBe("active");
    });
  });

  // 5. Webhook: customer.subscription.updated
  describe("Webhook: customer.subscription.updated", () => {
    it("should update subscription tier", async () => {
      // Set up existing customer + subscription
      const customer = stripeService.createCustomer(
        "user-update",
        "update@animaforge.app",
      );
      const sub = stripeService.createSubscription(customer.id, "creator");

      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_2",
          type: "customer.subscription.updated",
          data: {
            object: {
              id: sub.id,
              metadata: { tier: "pro" },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("subscription_updated");

      // Verify updated
      const updated = stripeService.getSubscriptionByCustomer(customer.id);
      expect(updated!.tier).toBe("pro");
    });
  });

  // 6. Webhook: customer.subscription.deleted (canceled)
  describe("Webhook: customer.subscription.deleted", () => {
    it("should cancel the subscription", async () => {
      const customer = stripeService.createCustomer(
        "user-cancel",
        "cancel@animaforge.app",
      );
      const sub = stripeService.createSubscription(customer.id, "pro");

      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_3",
          type: "customer.subscription.deleted",
          data: {
            object: { id: sub.id },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("subscription_canceled");

      const canceled = stripeService.getSubscriptionByCustomer(customer.id);
      expect(canceled!.status).toBe("canceled");
    });
  });

  // 7. Webhook: invoice.payment_failed
  describe("Webhook: invoice.payment_failed", () => {
    it("should mark subscription as past_due", async () => {
      const customer = stripeService.createCustomer(
        "user-fail",
        "fail@animaforge.app",
      );
      const sub = stripeService.createSubscription(customer.id, "studio");

      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_4",
          type: "invoice.payment_failed",
          data: {
            object: {
              customer: customer.id,
              subscription: sub.id,
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("payment_failed_recorded");

      const updated = stripeService.getSubscriptionByCustomer(customer.id);
      expect(updated!.status).toBe("past_due");
    });
  });

  // 8. Webhook signature verification
  describe("Webhook middleware", () => {
    it("should reject requests without stripe-signature header", async () => {
      const res = await request(app)
        .post("/billing/stripe-webhook")
        .send({ type: "test.event", data: { object: {} } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("stripe-signature");
    });

    it("should reject invalid signature format", async () => {
      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "invalid-signature")
        .send({ type: "test.event", data: { object: {} } });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid webhook signature");
    });
  });

  // 9. Credit allocation on subscription activation
  describe("Credit allocation", () => {
    it("should allocate correct credits when subscription is created via checkout", async () => {
      await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_credits",
          type: "checkout.session.completed",
          data: {
            object: {
              client_reference_id: "user-credits",
              customer_email: "credits@animaforge.app",
              metadata: { tier: "studio" },
            },
          },
        });

      // Studio tier should allocate 1000 credits
      const { billingService } = await import("../services/billingService");
      // Use the stripeService's reference to billingService
      const customer = stripeService.getCustomerByUserId("user-credits");
      expect(customer).toBeDefined();

      // Credits are allocated via billingService.topUp during createSubscription
      const credits = (await import("../services/billingService")).getCredits(
        "user-credits",
      );
      expect(credits.balance).toBe(PRICING.studio.credits);
    });
  });

  // 10. StripeService direct unit tests
  describe("stripeService unit tests", () => {
    it("should create and retrieve customer by userId", () => {
      const customer = stripeService.createCustomer(
        "user-direct",
        "direct@animaforge.app",
      );
      expect(customer.id).toMatch(/^cus_/);
      expect(customer.email).toBe("direct@animaforge.app");

      const retrieved = stripeService.getCustomerByUserId("user-direct");
      expect(retrieved).toEqual(customer);
    });

    it("should return existing customer on duplicate createCustomer call", () => {
      const c1 = stripeService.createCustomer("user-dup", "dup@animaforge.app");
      const c2 = stripeService.createCustomer("user-dup", "dup2@animaforge.app");
      expect(c1.id).toBe(c2.id);
    });

    it("should throw on unknown tier for createSubscription", () => {
      const customer = stripeService.createCustomer(
        "user-bad-tier",
        "bad@animaforge.app",
      );
      expect(() => stripeService.createSubscription(customer.id, "platinum")).toThrow(
        "Unknown tier",
      );
    });

    it("should handle invoice.payment_succeeded by topping up credits", async () => {
      const customer = stripeService.createCustomer(
        "user-invoice",
        "invoice@animaforge.app",
      );
      stripeService.createSubscription(customer.id, "pro");

      // Pro gives 300 credits on creation. Payment succeeded should add 300 more.
      const res = await request(app)
        .post("/billing/stripe-webhook")
        .set("stripe-signature", "t=1234567890,v1=mockhash")
        .send({
          id: "evt_test_invoice",
          type: "invoice.payment_succeeded",
          data: {
            object: { customer: customer.id },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("payment_recorded");

      const credits = (await import("../services/billingService")).getCredits(
        "user-invoice",
      );
      // 300 from subscription creation + 300 from invoice payment
      expect(credits.balance).toBe(600);
    });
  });
});
