import { z } from "zod";

export const VideoExportSchema = z.object({
  projectId: z.string().uuid(),
  shotIds: z.array(z.string().uuid()).min(1, "At least one shot is required"),
  format: z.enum(["mp4", "webm", "mov"]),
  codec: z.enum(["h264", "h265", "av1", "vp9"]),
  resolution: z.enum(["720p", "1080p", "4k"]),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
});

export const AudioExportSchema = z.object({
  projectId: z.string().uuid(),
  shotIds: z.array(z.string().uuid()).min(1, "At least one shot is required"),
  format: z.enum(["wav", "mp3", "aac", "opus"]),
});

export const ProjectExportSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(["mp4", "webm", "mov"]),
  includeAssets: z.boolean(),
});

export const AvatarExportSchema = z.object({
  characterId: z.string().uuid(),
  format: z.enum(["gltf", "usd", "fbx", "bvh", "arkit"]),
});

export type VideoExportInput = z.infer<typeof VideoExportSchema>;
export type AudioExportInput = z.infer<typeof AudioExportSchema>;
export type ProjectExportInput = z.infer<typeof ProjectExportSchema>;
export type AvatarExportInput = z.infer<typeof AvatarExportSchema>;

export type ExportJobStatus =
  | "queued"
  | "processing"
  | "encoding"
  | "packaging"
  | "completed"
  | "failed";

export interface ExportJob {
  id: string;
  type: "video" | "audio" | "project" | "avatar";
  status: ExportJobStatus;
  progress: number;
  params: VideoExportInput | AudioExportInput | ProjectExportInput | AvatarExportInput;
  outputUrl: string | null;
  fileSize: number | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}
