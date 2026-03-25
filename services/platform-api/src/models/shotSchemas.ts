import { z } from "zod";

export const SceneGraphSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  camera: z.object({
    angle: z.string().min(1),
    movement: z.string().min(1),
    focal_length: z.string().optional(),
  }),
  action: z.string().min(1, "Action is required"),
  emotion: z.string().min(1, "Emotion is required"),
  timing: z.object({
    duration_ms: z.number().int().positive(),
    pacing: z.string().min(1),
  }),
  dialogue: z.string().optional(),
});

export const CreateShotSchema = z.object({
  sceneGraph: SceneGraphSchema,
  prompt: z.string().min(1, "Prompt is required").max(2000),
  styleRef: z.string().min(1).optional(),
  characterRefs: z.array(z.string()).default([]),
  durationMs: z.number().int().positive(),
  aspectRatio: z.string().regex(/^\d+:\d+$/, "Aspect ratio must be in format W:H"),
});

export const UpdateShotSchema = z.object({
  sceneGraph: SceneGraphSchema.optional(),
  prompt: z.string().min(1).max(2000).optional(),
  styleRef: z.string().min(1).optional(),
  characterRefs: z.array(z.string()).optional(),
  durationMs: z.number().int().positive().optional(),
  aspectRatio: z.string().regex(/^\d+:\d+$/).optional(),
});

export const ShotParamsSchema = z.object({
  id: z.string().uuid(),
});

export const SceneParamsSchema = z.object({
  sceneId: z.string().uuid(),
});

export const ProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export type CreateShotInput = z.infer<typeof CreateShotSchema>;
export type UpdateShotInput = z.infer<typeof UpdateShotSchema>;
export type SceneGraph = z.infer<typeof SceneGraphSchema>;

export type ShotStatus = "draft" | "approved" | "locked";

export interface Shot {
  id: string;
  sceneId: string;
  projectId: string;
  sceneGraph: SceneGraph;
  prompt: string;
  styleRef?: string;
  characterRefs: string[];
  durationMs: number;
  aspectRatio: string;
  status: ShotStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
