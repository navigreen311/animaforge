import { v4 as uuidv4 } from "uuid";
import {
  PluginManifestSchema,
  type Plugin,
  type PluginInstallation,
  type PluginExecution,
  type PluginManifestInput,
  type PluginCategory,
  type PluginHook,
  type PluginMetrics,
} from "../models/pluginSchemas.js";

// ── In-memory stores ────────────────────────────────────────────────
const plugins = new Map<string, Plugin>();
const installations = new Map<string, PluginInstallation[]>(); // userId → installs
const executions: PluginExecution[] = [];

export const pluginService = {
  /**
   * Register a new plugin from its manifest.
   * Validates the manifest and stores with pending_review status.
   */
  async registerPlugin(
    manifest: PluginManifestInput,
  ): Promise<{ pluginId: string; status: "pending_review" }> {
    // Validate manifest
    PluginManifestSchema.parse(manifest);

    const pluginId = uuidv4();
    const now = new Date().toISOString();
    const plugin: Plugin = {
      pluginId,
      manifest,
      status: "pending_review",
      createdAt: now,
      updatedAt: now,
    };
    plugins.set(pluginId, plugin);
    return { pluginId, status: "pending_review" };
  },

  /**
   * Certify a plugin after security review.
   */
  async certifyPlugin(
    pluginId: string,
    reviewerId: string,
  ): Promise<{ certified: true; certificate: string } | undefined> {
    const plugin = plugins.get(pluginId);
    if (!plugin) return undefined;
    if (plugin.status === "revoked") return undefined;

    const certificate = `CERT-${pluginId.slice(0, 8)}-${Date.now()}`;
    plugin.status = "certified";
    plugin.reviewerId = reviewerId;
    plugin.certificate = certificate;
    plugin.updatedAt = new Date().toISOString();
    plugins.set(pluginId, plugin);
    return { certified: true, certificate };
  },

  /**
   * List plugins, optionally filtered by category and certification status.
   */
  async listPlugins(
    category?: PluginCategory,
    certifiedOnly?: boolean,
  ): Promise<Plugin[]> {
    let result = Array.from(plugins.values());
    if (category) {
      result = result.filter((p) => p.manifest.category === category);
    }
    if (certifiedOnly) {
      result = result.filter((p) => p.status === "certified");
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * Get a single plugin by ID.
   */
  async getPlugin(pluginId: string): Promise<Plugin | undefined> {
    return plugins.get(pluginId);
  },

  /**
   * Install a plugin for a user.
   */
  async installPlugin(
    userId: string,
    pluginId: string,
  ): Promise<PluginInstallation | undefined> {
    const plugin = plugins.get(pluginId);
    if (!plugin) return undefined;

    const userInstalls = installations.get(userId) ?? [];
    // Check if already installed
    if (userInstalls.some((i) => i.pluginId === pluginId)) {
      return userInstalls.find((i) => i.pluginId === pluginId);
    }

    const installation: PluginInstallation = {
      userId,
      pluginId,
      installedAt: new Date().toISOString(),
    };
    userInstalls.push(installation);
    installations.set(userId, userInstalls);
    return installation;
  },

  /**
   * Uninstall a plugin for a user.
   */
  async uninstallPlugin(
    userId: string,
    pluginId: string,
  ): Promise<boolean> {
    const userInstalls = installations.get(userId) ?? [];
    const idx = userInstalls.findIndex((i) => i.pluginId === pluginId);
    if (idx === -1) return false;

    userInstalls.splice(idx, 1);
    installations.set(userId, userInstalls);
    return true;
  },

  /**
   * Get all plugins installed by a user.
   */
  async getUserPlugins(userId: string): Promise<PluginInstallation[]> {
    return installations.get(userId) ?? [];
  },

  /**
   * Simulate executing a plugin hook.
   */
  async executePluginHook(
    pluginId: string,
    hookName: PluginHook,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; hookName: PluginHook; result: Record<string, unknown> } | undefined> {
    const plugin = plugins.get(pluginId);
    if (!plugin) return undefined;
    if (plugin.status !== "certified") return undefined;

    // Simulate execution (random success for demonstration, but deterministic for tests)
    const success = true;
    const execution: PluginExecution = {
      pluginId,
      hookName,
      executedAt: new Date().toISOString(),
      success,
    };
    executions.push(execution);

    return {
      success,
      hookName,
      result: { ...data, processed: true, pluginId, timestamp: execution.executedAt },
    };
  },

  /**
   * Revoke a plugin's certification.
   */
  async revokePlugin(
    pluginId: string,
    reason: string,
  ): Promise<Plugin | undefined> {
    const plugin = plugins.get(pluginId);
    if (!plugin) return undefined;

    plugin.status = "revoked";
    plugin.revokeReason = reason;
    plugin.certificate = undefined;
    plugin.updatedAt = new Date().toISOString();
    plugins.set(pluginId, plugin);
    return plugin;
  },

  /**
   * Get metrics for a plugin.
   */
  async getPluginMetrics(pluginId: string): Promise<PluginMetrics | undefined> {
    const plugin = plugins.get(pluginId);
    if (!plugin) return undefined;

    // Count installs across all users
    let installs = 0;
    const activeUsers = new Set<string>();
    for (const [userId, userInstalls] of installations.entries()) {
      if (userInstalls.some((i) => i.pluginId === pluginId)) {
        installs++;
        activeUsers.add(userId);
      }
    }

    // Calculate error rate from executions
    const pluginExecutions = executions.filter((e) => e.pluginId === pluginId);
    const totalExecs = pluginExecutions.length;
    const failedExecs = pluginExecutions.filter((e) => !e.success).length;
    const errorRate = totalExecs > 0 ? failedExecs / totalExecs : 0;

    return {
      installs,
      active_users: activeUsers.size,
      avg_rating: 0, // Ratings not yet implemented
      error_rate: Math.round(errorRate * 100) / 100,
    };
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    plugins.clear();
    installations.clear();
    executions.length = 0;
  },
};
