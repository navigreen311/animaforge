import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { receiptService } from "../services/receiptService.js";
import { reproducibilityService } from "../services/reproducibilityService.js";
import receiptsRouter from "../routes/receipts.js";
import reproducibilityRouter from "../routes/reproducibility.js";
import { errorHandler } from "../middleware/errorHandler.js";

// Build a self-contained test app
const app = express();
app.use(express.json());
app.use("/api/v1", receiptsRouter);
app.use("/api/v1", reproducibilityRouter);
app.use(errorHandler);

// Build a mock JWT
function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const TOKEN = makeToken("user-1", "test@animaforge.io", "editor");
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const PROJECT_ID = "proj-001";

describe("UX Receipts (D9)", () => {
  beforeEach(() => {
    receiptService._clear();
  });

  // 1. Create a receipt
  it("POST /api/v1/receipts — creates a receipt", async () => {
    const res = await request(app)
      .post("/api/v1/receipts")
      .set(AUTH)
      .send({ userId: "user-1", action: "generation_completed", details: { projectId: PROJECT_ID, credits: 5 } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receiptId).toBeDefined();
    expect(res.body.data.action).toBe("generation_completed");
    expect(res.body.data.status).toBe("confirmed");
  });

  // 2. List receipts with pagination
  it("GET /api/v1/receipts — returns paginated receipts", async () => {
    await receiptService.createReceipt("user-1", "generation_started", {});
    await receiptService.createReceipt("user-1", "generation_completed", { credits: 2 });
    await receiptService.createReceipt("user-2", "export_completed", {});

    const res = await request(app)
      .get("/api/v1/receipts?userId=user-1&page=1&limit=10")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.receipts).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
  });

  // 3. Get single receipt
  it("GET /api/v1/receipts/:id — returns a single receipt", async () => {
    const receipt = await receiptService.createReceipt("user-1", "payment_processed", { amount: 9.99 });

    const res = await request(app)
      .get(`/api/v1/receipts/${receipt.receiptId}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe("payment_processed");
    expect(res.body.data.details.amount).toBe(9.99);
  });

  // 4. Get receipts by project
  it("GET /api/v1/receipts/project/:projectId — returns project receipts", async () => {
    await receiptService.createReceipt("user-1", "generation_completed", { projectId: PROJECT_ID });
    await receiptService.createReceipt("user-1", "export_completed", { projectId: PROJECT_ID });
    await receiptService.createReceipt("user-1", "generation_completed", { projectId: "other-proj" });

    const res = await request(app)
      .get(`/api/v1/receipts/project/${PROJECT_ID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // 5. Generate summary
  it("GET /api/v1/receipts/summary — returns activity summary", async () => {
    await receiptService.createReceipt("user-1", "generation_completed", { credits: 3 });
    await receiptService.createReceipt("user-1", "generation_completed", { credits: 5 });
    await receiptService.createReceipt("user-1", "export_completed", {});
    await receiptService.createReceipt("user-1", "consent_granted", {});

    const res = await request(app)
      .get("/api/v1/receipts/summary?userId=user-1")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.totalGenerations).toBe(2);
    expect(res.body.data.totalExports).toBe(1);
    expect(res.body.data.creditsUsed).toBe(8);
    expect(res.body.data.actionsBreakdown.generation_completed).toBe(2);
    expect(res.body.data.actionsBreakdown.consent_granted).toBe(1);
  });
});

describe("Reproducibility (D10)", () => {
  beforeEach(() => {
    reproducibilityService._clear();
  });

  // 6. Capture snapshot
  it("POST /api/v1/reproducibility/snapshot — captures a snapshot", async () => {
    const res = await request(app)
      .post("/api/v1/reproducibility/snapshot")
      .set(AUTH)
      .send({ jobId: "job-1", parameters: { modelId: "sd-xl", prompt: "a cat", seed: 42 } });

    expect(res.status).toBe(201);
    expect(res.body.data.snapshotId).toBeDefined();
    expect(res.body.data.jobId).toBe("job-1");
    expect(res.body.data.modelId).toBe("sd-xl");
    expect(res.body.data.inputHash).toBeDefined();
    expect(res.body.data.inputHash).toHaveLength(64); // SHA-256 hex
  });

  // 7. Get snapshot
  it("GET /api/v1/reproducibility/snapshot/:id — retrieves a snapshot", async () => {
    const snapshot = await reproducibilityService.captureSnapshot("job-1", {
      modelId: "sd-xl",
      prompt: "a dog",
      seed: 99,
    });

    const res = await request(app)
      .get(`/api/v1/reproducibility/snapshot/${snapshot.snapshotId}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.parameters.prompt).toBe("a dog");
    expect(res.body.data.parameters.seed).toBe(99);
  });

  // 8. Replay generation
  it("POST /api/v1/reproducibility/replay/:snapshotId — replays a generation", async () => {
    const snapshot = await reproducibilityService.captureSnapshot("job-1", {
      modelId: "sd-xl",
      prompt: "landscape",
      seed: 123,
    });

    const res = await request(app)
      .post(`/api/v1/reproducibility/replay/${snapshot.snapshotId}`)
      .set(AUTH);

    expect(res.status).toBe(201);
    expect(res.body.data.newJobId).toBeDefined();
    expect(res.body.data.originalSnapshotId).toBe(snapshot.snapshotId);
    expect(res.body.data.parameters.seed).toBe(123);
  });

  // 9. Compare snapshots
  it("POST /api/v1/reproducibility/compare — compares two snapshots", async () => {
    const a = await reproducibilityService.captureSnapshot("job-1", {
      modelId: "sd-xl",
      prompt: "a cat",
      seed: 42,
    });
    const b = await reproducibilityService.captureSnapshot("job-2", {
      modelId: "sd-xl",
      prompt: "a dog",
      seed: 42,
    });

    const res = await request(app)
      .post("/api/v1/reproducibility/compare")
      .set(AUTH)
      .send({ snapshotIdA: a.snapshotId, snapshotIdB: b.snapshotId });

    expect(res.status).toBe(200);
    expect(res.body.data.identical).toBe(false);
    expect(res.body.data.differences).toHaveLength(1);
    expect(res.body.data.differences[0].key).toBe("prompt");
  });

  // 10. Job lineage
  it("GET /api/v1/reproducibility/lineage/:jobId — returns generation lineage", async () => {
    const snap1 = await reproducibilityService.captureSnapshot("job-1", {
      modelId: "sd-xl",
      prompt: "sunset",
      seed: 1,
    });

    // Replay creates a child snapshot
    const replay1 = await reproducibilityService.replayGeneration(snap1.snapshotId);
    // Replay the replay
    const replay2 = await reproducibilityService.replayGeneration(replay1!.snapshotId);

    const res = await request(app)
      .get(`/api/v1/reproducibility/lineage/${replay2!.newJobId}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    // Lineage includes all 3 snapshots in the chain
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data[0].jobId).toBe("job-1");
  });
});
