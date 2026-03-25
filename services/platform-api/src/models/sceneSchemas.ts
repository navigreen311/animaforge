import { z } from "zod";

export const CreateSceneSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  order: z.number().int().nonnegative(),
});

export const UpdateSceneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().nonnegative().optional(),
});

export const SceneParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export type CreateSceneInput = z.infer<typeof CreateSceneSchema>;
export type UpdateSceneInput = z.infer<typeof UpdateSceneSchema>;

export interface Scene {
  id: string;
  projectId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
