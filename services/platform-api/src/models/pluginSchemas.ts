import { z } from "zod";

// ── Plugin category enum ─────────────────────────────────────────────
export const PluginCategoryEnum = z.enum([
  "generation",
  "post_processing",
  "export",
  "analytics",
  "ui_extension",
  "integration",
]);
export type PluginCategory = z.infer<typeof PluginCategoryEnum>;

// ── Plugin permission enum ───────────────────────────────────────────
export const PluginPermissionEnum = z.enum([
  "read_projects",
  "write_projects",
  "read_shots",
  "generate",
  "access_storage",
  "webhook",
]);
export type PluginPermission = z.infer<typeof PluginPermissionEnum>;

// ── Plugin hook enum ─────────────────────────────────────────────────
export const PluginHookEnum = z.enum([
  "pre_generation",
  "post_generation",
  "on_export",
  "on_review",
]);
export type PluginHook = z.infer<typeof PluginHookEnum>;

// ── Plugin certification status ──────────────────────────────────────
export const CertificationStatusEnum = z.enum([
  "pending_review",
  "certified",
  "revoked",
]);
export type CertificationStatus = z.infer<typeof CertificationStatusEnum>;

// ── Zod schemas ──────────────────────────────────────────────────────
export const PluginManifestSchema = z.object({
  id: z.string().min(1, "Plugin ID is required"),
  name: z.string().min(1, "Plugin name is required"),
  version: z.string().min(1, "Version is required"),
  author: z.string().min(1, "Author is required"),
  description: z.string().min(1, "Description is required"),
  permissions: z.array(PluginPermissionEnum).min(1, "At least one permission is required"),
  entryPoint: z.string().min(1, "Entry point is required"),
  iconUrl: z.string().url("Icon URL must be a valid URL"),
  category: PluginCategoryEnum,
});

export const CertifyPluginSchema = z.object({
  reviewerId: z.string().min(1, "Reviewer ID is required"),
});

export const ExecuteHookSchema = z.object({
  hookName: PluginHookEnum,
  data: z.record(z.unknown()).default({}),
});

export const ListPluginsQuerySchema = z.object({
  category: PluginCategoryEnum.optional(),
  certified_only: z.enum(["true", "false"]).optional(),
});

export const RevokePluginSchema = z.object({
  reason: z.string().min(1, "Revocation reason is required"),
});

// ── Param schemas ────────────────────────────────────────────────────
export const PluginParamsSchema = z.object({
  id: z.string().min(1),
});

// ── TypeScript interfaces ────────────────────────────────────────────
export type PluginManifestInput = z.infer<typeof PluginManifestSchema>;

export interface Plugin {
  pluginId: string;
  manifest: PluginManifestInput;
  status: CertificationStatus;
  reviewerId?: string;
  certificate?: string;
  revokeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PluginInstallation {
  userId: string;
  pluginId: string;
  installedAt: string;
}

export interface PluginExecution {
  pluginId: string;
  hookName: PluginHook;
  executedAt: string;
  success: boolean;
}

export interface PluginMetrics {
  installs: number;
  active_users: number;
  avg_rating: number;
  error_rate: number;
}
