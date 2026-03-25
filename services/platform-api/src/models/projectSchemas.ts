import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const worldBibleSchema = z.object({}).passthrough();

export const brandKitSchema = z.object({}).passthrough();

export const styleLockSchema = z.object({}).passthrough();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "active" | "archived" | "deleted";
  worldBible: Record<string, unknown>;
  brandKit: Record<string, unknown>;
  styleLock: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
