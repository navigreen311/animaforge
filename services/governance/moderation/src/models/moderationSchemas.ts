import { z } from "zod";

// ---------- Enums / Literals ----------

export const ContentType = z.enum(["image", "video", "audio", "text"]);
export type ContentType = z.infer<typeof ContentType>;

export const ModerationResult = z.enum(["pass", "flag", "block"]);
export type ModerationResult = z.infer<typeof ModerationResult>;

export const ModerationCategory = z.enum([
  "violence",
  "sexual",
  "impersonation",
  "minors",
  "safe",
]);
export type ModerationCategory = z.infer<typeof ModerationCategory>;

// ---------- Request Schemas ----------

export const ModerateRequestSchema = z.object({
  job_id: z.string().min(1),
  content_url: z.string().url(),
  content_type: ContentType,
});
export type ModerateRequest = z.infer<typeof ModerateRequestSchema>;

export const PreCheckRequestSchema = z.object({
  prompt: z.string().min(1),
  scene_graph: z.record(z.unknown()).optional(),
});
export type PreCheckRequest = z.infer<typeof PreCheckRequestSchema>;

// ---------- Response Schemas ----------

export const ModerateResponseSchema = z.object({
  result: ModerationResult,
  category: ModerationCategory,
  score: z.number().min(0).max(1),
  details: z.string(),
});
export type ModerateResponse = z.infer<typeof ModerateResponseSchema>;

export const PreCheckResponseSchema = z.object({
  allowed: z.boolean(),
  reason_code: z.string(),
  blocked_categories: z.array(ModerationCategory),
});
export type PreCheckResponse = z.infer<typeof PreCheckResponseSchema>;

// ---------- Log Record ----------

export const ModerationLogRecordSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string(),
  timestamp: z.string().datetime(),
  result: ModerationResult,
  category: ModerationCategory,
  score: z.number(),
  details: z.string(),
});
export type ModerationLogRecord = z.infer<typeof ModerationLogRecordSchema>;
