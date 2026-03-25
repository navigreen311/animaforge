import { v4 as uuidv4 } from "uuid";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "../models/projectSchemas.js";

const projects = new Map<string, Project>();

export const projectService = {
  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      title: input.title,
      description: input.description ?? "",
      status: "active",
      worldBible: {},
      brandKit: {},
      styleLock: {},
      createdAt: now,
      updatedAt: now,
    };
    projects.set(project.id, project);
    return project;
  },

  list(
    page: number,
    limit: number,
    status?: string,
  ): { items: Project[]; total: number; page: number; limit: number } {
    let items = Array.from(projects.values()).filter(
      (p) => p.status !== "deleted",
    );

    if (status) {
      items = items.filter((p) => p.status === status);
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return { items: paged, total, page, limit };
  },

  getById(id: string): Project | undefined {
    const project = projects.get(id);
    if (project && project.status === "deleted") return undefined;
    return project;
  },

  update(id: string, input: UpdateProjectInput): Project | undefined {
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    const updated: Project = {
      ...project,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, updated);
    return updated;
  },

  softDelete(id: string): boolean {
    const project = projects.get(id);
    if (!project || project.status === "deleted") return false;

    project.status = "deleted";
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return true;
  },

  updateWorldBible(
    id: string,
    worldBible: Record<string, unknown>,
  ): Project | undefined {
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.worldBible = worldBible;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  updateBrandKit(
    id: string,
    brandKit: Record<string, unknown>,
  ): Project | undefined {
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.brandKit = brandKit;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  updateStyleLock(
    id: string,
    styleLock: Record<string, unknown>,
  ): Project | undefined {
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.styleLock = styleLock;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  /** Resets the in-memory store — for testing only. */
  resetStore(): void {
    projects.clear();
  },
};
