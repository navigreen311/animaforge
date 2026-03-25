import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { pluginService } from "../services/pluginService.js";
import * as apiResponse from "../utils/apiResponse.js";
import {
  PluginManifestSchema,
  CertifyPluginSchema,
  ExecuteHookSchema,
  ListPluginsQuerySchema,
  RevokePluginSchema,
  PluginParamsSchema,
} from "../models/pluginSchemas.js";

const router = Router();

// ── POST /api/v1/plugins — register a new plugin ────────────────────
router.post(
  "/plugins",
  requireAuth,
  validate(PluginManifestSchema, "body"),
  async (req: Request, res: Response) => {
    const result = await pluginService.registerPlugin(req.body);
    apiResponse.success(res, result, 201);
  },
);

// ── PUT /api/v1/plugins/:id/certify — certify plugin (admin only) ───
router.put(
  "/plugins/:id/certify",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  validate(CertifyPluginSchema, "body"),
  async (req: Request, res: Response) => {
    // Check admin role
    if (req.user?.role !== "admin") {
      apiResponse.error(res, "FORBIDDEN", "Only admins can certify plugins", 403);
      return;
    }
    const { id } = req.params;
    const { reviewerId } = req.body;
    const result = await pluginService.certifyPlugin(id, reviewerId);
    if (!result) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not found or already revoked", 404);
      return;
    }
    apiResponse.success(res, result);
  },
);

// ── GET /api/v1/plugins — list/browse plugins ───────────────────────
router.get(
  "/plugins",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = ListPluginsQuerySchema.safeParse(req.query);
    const category = parsed.success ? parsed.data.category : undefined;
    const certifiedOnly = parsed.success ? parsed.data.certified_only === "true" : false;
    const result = await pluginService.listPlugins(category, certifiedOnly);
    apiResponse.success(res, result);
  },
);

// ── GET /api/v1/plugins/installed — user's installed plugins ────────
// NOTE: This must come BEFORE /plugins/:id to avoid route conflict
router.get(
  "/plugins/installed",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await pluginService.getUserPlugins(userId);
    apiResponse.success(res, result);
  },
);

// ── GET /api/v1/plugins/:id — plugin detail ─────────────────────────
router.get(
  "/plugins/:id",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const plugin = await pluginService.getPlugin(id);
    if (!plugin) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not found", 404);
      return;
    }
    apiResponse.success(res, plugin);
  },
);

// ── POST /api/v1/plugins/:id/install — install plugin ───────────────
router.post(
  "/plugins/:id/install",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await pluginService.installPlugin(userId, id);
    if (!result) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not found", 404);
      return;
    }
    apiResponse.success(res, result, 201);
  },
);

// ── DELETE /api/v1/plugins/:id/install — uninstall plugin ────────────
router.delete(
  "/plugins/:id/install",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const removed = await pluginService.uninstallPlugin(userId, id);
    if (!removed) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not installed", 404);
      return;
    }
    apiResponse.success(res, { uninstalled: true });
  },
);

// ── POST /api/v1/plugins/:id/execute — execute plugin hook ──────────
router.post(
  "/plugins/:id/execute",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  validate(ExecuteHookSchema, "body"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { hookName, data } = req.body;
    const result = await pluginService.executePluginHook(id, hookName, data);
    if (!result) {
      apiResponse.error(res, "EXECUTION_FAILED", "Plugin not found or not certified", 400);
      return;
    }
    apiResponse.success(res, result);
  },
);

// ── PUT /api/v1/plugins/:id/revoke — revoke certification ───────────
router.put(
  "/plugins/:id/revoke",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  validate(RevokePluginSchema, "body"),
  async (req: Request, res: Response) => {
    if (req.user?.role !== "admin") {
      apiResponse.error(res, "FORBIDDEN", "Only admins can revoke plugins", 403);
      return;
    }
    const { id } = req.params;
    const { reason } = req.body;
    const result = await pluginService.revokePlugin(id, reason);
    if (!result) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not found", 404);
      return;
    }
    apiResponse.success(res, result);
  },
);

// ── GET /api/v1/plugins/:id/metrics — plugin metrics ────────────────
router.get(
  "/plugins/:id/metrics",
  requireAuth,
  validate(PluginParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const metrics = await pluginService.getPluginMetrics(id);
    if (!metrics) {
      apiResponse.error(res, "NOT_FOUND", "Plugin not found", 404);
      return;
    }
    apiResponse.success(res, metrics);
  },
);

export default router;
