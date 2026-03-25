import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type { Shot, CreateShotInput, UpdateShotInput } from "../models/shotSchemas.js";

// In-memory fallback store
const shots = new Map<string, Shot>();

export const shotService = {
  async create(sceneId: string, projectId: string, input: CreateShotInput): Promise<Shot> {
    if (prisma) {
      return prisma.shot.create({
        data: {
          sceneId,
          projectId,
          sceneGraph: input.sceneGraph as any,
          prompt: input.prompt,
          styleRef: input.styleRef,
          characterRefs: input.characterRefs as any,
          durationMs: input.durationMs,
          aspectRatio: input.aspectRatio,
          status: "draft",
        },
      }) as unknown as Shot;
    }

    // In-memory fallback
    const now = new Date().toISOString();
    const shot: Shot = {
      id: uuidv4(),
      sceneId,
      projectId,
      sceneGraph: input.sceneGraph,
      prompt: input.prompt,
      styleRef: input.styleRef,
      characterRefs: input.characterRefs,
      durationMs: input.durationMs,
      aspectRatio: input.aspectRatio,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    shots.set(shot.id, shot);
    return shot;
  },

  async listByProject(projectId: string): Promise<Shot[]> {
    if (prisma) {
      const results = await prisma.shot.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          scene: true,
        },
      });
      return results as unknown as Shot[];
    }

    // In-memory fallback
    return Array.from(shots.values()).filter((s) => s.projectId === projectId);
  },

  async getById(id: string): Promise<Shot | undefined> {
    if (prisma) {
      const shot = await prisma.shot.findUnique({
        where: { id },
        include: {
          scene: true,
        },
      });
      return (shot ?? undefined) as Shot | undefined;
    }

    // In-memory fallback
    return shots.get(id);
  },

  async update(id: string, input: UpdateShotInput): Promise<Shot | undefined> {
    if (prisma) {
      const existing = await prisma.shot.findUnique({ where: { id } });
      if (!existing) return undefined;
      if (existing.status === "locked") return undefined;

      const data: Record<string, unknown> = { ...input };
      if (input.sceneGraph !== undefined) {
        data.sceneGraph = input.sceneGraph as any;
      }
      if (input.characterRefs !== undefined) {
        data.characterRefs = input.characterRefs as any;
      }

      const updated = await prisma.shot.update({
        where: { id },
        data,
      });
      return updated as unknown as Shot;
    }

    // In-memory fallback
    const shot = shots.get(id);
    if (!shot) return undefined;
    if (shot.status === "locked") return undefined;

    const updated: Shot = {
      ...shot,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    shots.set(id, updated);
    return updated;
  },

  async approve(id: string, userId: string): Promise<Shot | undefined> {
    if (prisma) {
      const existing = await prisma.shot.findUnique({ where: { id } });
      if (!existing) return undefined;
      if (existing.status === "locked") return undefined;

      const updated = await prisma.shot.update({
        where: { id },
        data: {
          status: "approved",
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });
      return updated as unknown as Shot;
    }

    // In-memory fallback
    const shot = shots.get(id);
    if (!shot) return undefined;
    if (shot.status === "locked") return undefined;

    const updated: Shot = {
      ...shot,
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    shots.set(id, updated);
    return updated;
  },

  async lock(id: string): Promise<Shot | undefined> {
    if (prisma) {
      const existing = await prisma.shot.findUnique({ where: { id } });
      if (!existing) return undefined;

      const updated = await prisma.shot.update({
        where: { id },
        data: { status: "locked" },
      });
      return updated as unknown as Shot;
    }

    // In-memory fallback
    const shot = shots.get(id);
    if (!shot) return undefined;

    const updated: Shot = {
      ...shot,
      status: "locked",
      updatedAt: new Date().toISOString(),
    };
    shots.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if (prisma) {
      const existing = await prisma.shot.findUnique({ where: { id } });
      if (!existing) return false;
      if (existing.status === "locked") return false;

      await prisma.shot.delete({ where: { id } });
      return true;
    }

    // In-memory fallback
    const shot = shots.get(id);
    if (!shot) return false;
    if (shot.status === "locked") return false;
    return shots.delete(id);
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    shots.clear();
  },
};
