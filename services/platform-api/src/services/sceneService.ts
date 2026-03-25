import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type { Scene, CreateSceneInput, UpdateSceneInput } from "../models/sceneSchemas.js";

// In-memory fallback store
const scenes = new Map<string, Scene>();

export const sceneService = {
  async create(projectId: string, input: CreateSceneInput): Promise<Scene> {
    if (prisma) {
      return prisma.scene.create({
        data: {
          projectId,
          title: input.title,
          order: input.order,
        },
        include: {
          shots: true,
        },
      }) as unknown as Scene;
    }

    // In-memory fallback
    const now = new Date().toISOString();
    const scene: Scene = {
      id: uuidv4(),
      projectId,
      title: input.title,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    };
    scenes.set(scene.id, scene);
    return scene;
  },

  async listByProject(projectId: string): Promise<Scene[]> {
    if (prisma) {
      const results = await prisma.scene.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
        include: {
          shots: true,
        },
      });
      return results as unknown as Scene[];
    }

    // In-memory fallback
    return Array.from(scenes.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  },

  async getById(id: string): Promise<Scene | undefined> {
    if (prisma) {
      const scene = await prisma.scene.findUnique({
        where: { id },
        include: {
          shots: true,
          project: true,
        },
      });
      return (scene ?? undefined) as Scene | undefined;
    }

    // In-memory fallback
    return scenes.get(id);
  },

  async update(id: string, input: UpdateSceneInput): Promise<Scene | undefined> {
    if (prisma) {
      const existing = await prisma.scene.findUnique({ where: { id } });
      if (!existing) return undefined;

      const updated = await prisma.scene.update({
        where: { id },
        data: { ...input },
        include: { shots: true },
      });
      return updated as unknown as Scene;
    }

    // In-memory fallback
    const scene = scenes.get(id);
    if (!scene) return undefined;

    const updated: Scene = {
      ...scene,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    scenes.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if (prisma) {
      const existing = await prisma.scene.findUnique({ where: { id } });
      if (!existing) return false;

      await prisma.scene.delete({ where: { id } });
      return true;
    }

    // In-memory fallback
    return scenes.delete(id);
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    scenes.clear();
  },
};
