import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { pluginService } from "../services/pluginService.js";
import pluginsRouter from "../routes/plugins.js";
import { errorHandler } from "../middleware/errorHandler.js";

// Build a self-contained test app
const app = express();
app.use(express.json());
app.use("/api/v1", pluginsRouter);
app.use(errorHandler);

// Build a mock JWT: header.payload.signature (base64url-encoded)
function makeToken(sub: string, email: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, role })).toString("base64url");
  const signature = Buffer.from("fake-signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const USER_TOKEN = makeToken("user-1", "dev@animaforge.io", "editor");
const ADMIN_TOKEN = makeToken("admin-1", "admin@animaforge.io", "admin");
const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };
const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const VALID_MANIFEST = {
  id: "my-plugin",
  name: "Test Plugin",
  version: "1.0.0",
  author: "Test Author",
  description: "A test plugin for AnimaForge",
  permissions: ["read_projects", "generate"],
  entryPoint: "dist/index.js",
  iconUrl: "https://example.com/icon.png",
  category: "generation",
};

describe("Plugin Certification System", () => {
  beforeEach(() => {
    pluginService._clear();
  });

  // 1. Register a plugin
  it("POST /api/v1/plugins — registers a plugin with pending_review status", async () => {
    const res = await request(app)
      .post("/api/v1/plugins")
      .set(USER_AUTH)
      .send(VALID_MANIFEST);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pluginId).toBeDefined();
    expect(res.body.data.status).toBe("pending_review");
  });

  // 2. Certify a plugin (admin only)
  it("PUT /api/v1/plugins/:id/certify — certifies a plugin as admin", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);

    const res = await request(app)
      .put(`/api/v1/plugins/${reg.pluginId}/certify`)
      .set(ADMIN_AUTH)
      .send({ reviewerId: "admin-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.certified).toBe(true);
    expect(res.body.data.certificate).toBeDefined();
    expect(res.body.data.certificate).toContain("CERT-");
  });

  // 3. Certify fails for non-admin
  it("PUT /api/v1/plugins/:id/certify — rejects non-admin certification", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);

    const res = await request(app)
      .put(`/api/v1/plugins/${reg.pluginId}/certify`)
      .set(USER_AUTH)
      .send({ reviewerId: "user-1" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 4. List plugins with optional filters
  it("GET /api/v1/plugins — lists plugins, supports category filter", async () => {
    await pluginService.registerPlugin(VALID_MANIFEST);
    await pluginService.registerPlugin({
      ...VALID_MANIFEST,
      id: "export-plugin",
      name: "Export Plugin",
      category: "export",
    });

    const res = await request(app)
      .get("/api/v1/plugins")
      .set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const filtered = await request(app)
      .get("/api/v1/plugins?category=export")
      .set(USER_AUTH);

    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].manifest.category).toBe("export");
  });

  // 5. Get plugin detail
  it("GET /api/v1/plugins/:id — returns plugin details", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);

    const res = await request(app)
      .get(`/api/v1/plugins/${reg.pluginId}`)
      .set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.pluginId).toBe(reg.pluginId);
    expect(res.body.data.manifest.name).toBe("Test Plugin");
    expect(res.body.data.status).toBe("pending_review");
  });

  // 6. Install and uninstall a plugin
  it("POST & DELETE /api/v1/plugins/:id/install — installs and uninstalls", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);

    const installRes = await request(app)
      .post(`/api/v1/plugins/${reg.pluginId}/install`)
      .set(USER_AUTH);

    expect(installRes.status).toBe(201);
    expect(installRes.body.data.pluginId).toBe(reg.pluginId);
    expect(installRes.body.data.userId).toBe("user-1");

    const uninstallRes = await request(app)
      .delete(`/api/v1/plugins/${reg.pluginId}/install`)
      .set(USER_AUTH);

    expect(uninstallRes.status).toBe(200);
    expect(uninstallRes.body.data.uninstalled).toBe(true);
  });

  // 7. Get user's installed plugins
  it("GET /api/v1/plugins/installed — returns user's installed plugins", async () => {
    const reg1 = await pluginService.registerPlugin(VALID_MANIFEST);
    const reg2 = await pluginService.registerPlugin({
      ...VALID_MANIFEST,
      id: "plugin-2",
      name: "Second Plugin",
    });
    await pluginService.installPlugin("user-1", reg1.pluginId);
    await pluginService.installPlugin("user-1", reg2.pluginId);

    const res = await request(app)
      .get("/api/v1/plugins/installed")
      .set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // 8. Execute a plugin hook (requires certification)
  it("POST /api/v1/plugins/:id/execute — executes hook on certified plugin", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);
    await pluginService.certifyPlugin(reg.pluginId, "admin-1");

    const res = await request(app)
      .post(`/api/v1/plugins/${reg.pluginId}/execute`)
      .set(USER_AUTH)
      .send({ hookName: "pre_generation", data: { prompt: "test" } });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.hookName).toBe("pre_generation");
    expect(res.body.data.result.processed).toBe(true);

    // Uncertified plugin should fail
    const reg2 = await pluginService.registerPlugin({
      ...VALID_MANIFEST,
      id: "uncertified",
      name: "Uncertified Plugin",
    });
    const failRes = await request(app)
      .post(`/api/v1/plugins/${reg2.pluginId}/execute`)
      .set(USER_AUTH)
      .send({ hookName: "post_generation", data: {} });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error.code).toBe("EXECUTION_FAILED");
  });

  // 9. Revoke a plugin's certification
  it("PUT /api/v1/plugins/:id/revoke — revokes certification", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);
    await pluginService.certifyPlugin(reg.pluginId, "admin-1");

    const res = await request(app)
      .put(`/api/v1/plugins/${reg.pluginId}/revoke`)
      .set(ADMIN_AUTH)
      .send({ reason: "Security vulnerability found" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("revoked");
    expect(res.body.data.revokeReason).toBe("Security vulnerability found");
    expect(res.body.data.certificate).toBeUndefined();
  });

  // 10. Get plugin metrics
  it("GET /api/v1/plugins/:id/metrics — returns plugin metrics", async () => {
    const reg = await pluginService.registerPlugin(VALID_MANIFEST);
    await pluginService.certifyPlugin(reg.pluginId, "admin-1");
    await pluginService.installPlugin("user-1", reg.pluginId);
    await pluginService.installPlugin("user-2", reg.pluginId);
    await pluginService.executePluginHook(reg.pluginId, "pre_generation", {});

    const res = await request(app)
      .get(`/api/v1/plugins/${reg.pluginId}/metrics`)
      .set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.installs).toBe(2);
    expect(res.body.data.active_users).toBe(2);
    expect(res.body.data.avg_rating).toBe(0);
    expect(res.body.data.error_rate).toBe(0);
  });
});
