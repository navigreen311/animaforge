import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import app from "../index";
import { _resetStores, COMMISSION_RATE } from "../services/marketplaceService";

beforeEach(() => {
  _resetStores();
});

const creatorId = uuidv4();
const buyerId = uuidv4();

const sampleItem = {
  name: "Epic Dragon Rig",
  type: "rig",
  price: 49.99,
  description: "Fully rigged dragon model with IK controls",
  previewUrl: "https://cdn.animaforge.io/previews/dragon-rig.png",
  creatorId,
};

async function createItem(overrides = {}) {
  const res = await request(app)
    .post("/marketplace/items")
    .send({ ...sampleItem, ...overrides });
  return res;
}

describe("Marketplace API", () => {
  test("POST /marketplace/items — lists an item for sale", async () => {
    const res = await createItem();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Epic Dragon Rig",
      type: "rig",
      price: 49.99,
      status: "active",
      creatorId,
    });
    expect(res.body.id).toBeDefined();
  });

  test("GET /marketplace/items — browse items with filters", async () => {
    await createItem();
    await createItem({ name: "Walk Cycle", type: "animation", price: 9.99 });

    const res = await request(app).get("/marketplace/items?type=rig");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("rig");
    expect(res.body.total).toBe(1);
  });

  test("GET /marketplace/items/:id — item detail", async () => {
    const created = await createItem();
    const res = await request(app).get(`/marketplace/items/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Epic Dragon Rig");
  });

  test("POST /marketplace/items/:id/purchase — purchase item with 70/30 split", async () => {
    const created = await createItem();
    const res = await request(app)
      .post(`/marketplace/items/${created.body.id}/purchase`)
      .send({ buyerId });

    expect(res.status).toBe(201);
    expect(res.body.transaction.amount).toBe(49.99);
    expect(res.body.transaction.commission).toBeCloseTo(49.99 * COMMISSION_RATE, 2);
    expect(res.body.transaction.sellerEarning).toBeCloseTo(49.99 * (1 - COMMISSION_RATE), 2);
  });

  test("POST /marketplace/items/:id/purchase — cannot buy own item", async () => {
    const created = await createItem();
    const res = await request(app)
      .post(`/marketplace/items/${created.body.id}/purchase`)
      .send({ buyerId: creatorId });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own item/i);
  });

  test("POST /marketplace/items/:id/reviews — submit and get reviews", async () => {
    const created = await createItem();
    const reviewRes = await request(app)
      .post(`/marketplace/items/${created.body.id}/reviews`)
      .send({ rating: 5, comment: "Amazing rig!", userId: buyerId });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.rating).toBe(5);

    const getRes = await request(app).get(`/marketplace/items/${created.body.id}/reviews`);
    expect(getRes.body.reviews).toHaveLength(1);
  });

  test("GET /marketplace/creators/:id/earnings — earnings dashboard", async () => {
    const created = await createItem();
    await request(app)
      .post(`/marketplace/items/${created.body.id}/purchase`)
      .send({ buyerId });

    const res = await request(app).get(`/marketplace/creators/${creatorId}/earnings`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeCloseTo(49.99 * (1 - COMMISSION_RATE), 2);
    expect(res.body.transactions).toHaveLength(1);
  });

  test("POST /marketplace/payouts/request — request payout", async () => {
    const created = await createItem();
    await request(app)
      .post(`/marketplace/items/${created.body.id}/purchase`)
      .send({ buyerId });

    const sellerEarning = +(49.99 * (1 - COMMISSION_RATE)).toFixed(2);

    const res = await request(app)
      .post("/marketplace/payouts/request")
      .send({ creatorId, amount: sellerEarning });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.amount).toBe(sellerEarning);

    // Verify balance updated
    const balanceRes = await request(app).get(`/marketplace/creators/${creatorId}/earnings`);
    expect(balanceRes.body.pending).toBe(0);
    expect(balanceRes.body.paid).toBeCloseTo(sellerEarning, 2);
  });
});
