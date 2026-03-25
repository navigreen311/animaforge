import { v4 as uuidv4 } from "uuid";
import type { Shot, CreateShotInput, UpdateShotInput } from "../models/shotSchemas.js";

const shots = new Map<string, Shot>();

export const shotService = {
  create(sceneId: string, projectId: string, input: CreateShotInput): Shot {
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

  listByProject(projectId: string): Shot[] {
    return Array.from(shots.values()).filter((s) => s.projectId === projectId);
  },

  getById(id: string): Shot | undefined {
    return shots.get(id);
  },

  update(id: string, input: UpdateShotInput): Shot | undefined {
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

  approve(id: string, userId: string): Shot | undefined {
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

  lock(id: string): Shot | undefined {
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

  delete(id: string): boolean {
    const shot = shots.get(id);
    if (!shot) return false;
    if (shot.status === "locked") return false;
    return shots.delete(id);
  },

  /** Clears all data — for testing only. */
  _clear(): void {
    shots.clear();
  },
};
