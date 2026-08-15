import { z } from 'zod';

export const SceneGraphSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  camera: z.object({
    angle: z.string().min(1),
    movement: z.string().min(1),
    focal_length: z.string().optional(),
  }),
  action: z.string().min(1, 'Action is required'),
  emotion: z.string().min(1, 'Emotion is required'),
  timing: z.object({
    duration_ms: z.number().int().positive(),
    pacing: z.string().min(1),
  }),
  dialogue: z.string().optional(),
});

export const CreateShotSchema = z.object({
  sceneGraph: SceneGraphSchema,
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  // Both columns are @db.Uuid FKs (style_packs.id, characters.id). Accepting
  // any string here pushed the failure down to Postgres, which answered
  // "Inconsistent column data: Error creating UUID" as a 500. Validating at the
  // boundary turns a bad reference into a 400 that names the field.
  styleRef: z.string().uuid('styleRef must be a style pack UUID').optional(),
  characterRefs: z.array(z.string().uuid('characterRefs must be character UUIDs')).default([]),
  durationMs: z.number().int().positive(),
  aspectRatio: z.string().regex(/^\d+:\d+$/, 'Aspect ratio must be in format W:H'),
});

export const UpdateShotSchema = z.object({
  sceneGraph: SceneGraphSchema.optional(),
  prompt: z.string().min(1).max(2000).optional(),
  styleRef: z.string().min(1).optional(),
  characterRefs: z.array(z.string()).optional(),
  durationMs: z.number().int().positive().optional(),
  aspectRatio: z
    .string()
    .regex(/^\d+:\d+$/)
    .optional(),
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

export type ShotStatus = 'draft' | 'approved' | 'locked';

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
