import { v4 as uuidv4 } from "uuid";
import type { Scene, CreateSceneInput, UpdateSceneInput } from "../models/sceneSchemas.js";

const scenes = new Map<string, Scene>();

export const sceneService = {
  create(projectId: string, input: CreateSceneInput): Scene {
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

  listByProject(projectId: string): Scene[] {
    return Array.from(scenes.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  },

  getById(id: string): Scene | undefined {
    return scenes.get(id);
  },

  update(id: string, input: UpdateSceneInput): Scene | undefined {
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

  delete(id: string): boolean {
    return scenes.delete(id);
  },

  /** Clears all data — for testing only. */
  _clear(): void {
    scenes.clear();
  },
};
