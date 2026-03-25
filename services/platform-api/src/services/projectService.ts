import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "../models/projectSchemas.js";

// In-memory fallback store
const projects = new Map<string, Project>();

export const projectService = {
  async create(input: CreateProjectInput): Promise<Project> {
    if (prisma) {
      return prisma.project.create({
        data: {
          title: input.title,
          description: input.description ?? "",
          status: "active",
          worldBible: {},
          brandKit: {},
          styleLock: {},
        },
      }) as unknown as Project;
    }

    // In-memory fallback
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

  async list(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ items: Project[]; total: number; page: number; limit: number }> {
    if (prisma) {
      const where: Record<string, unknown> = { deletedAt: null };
      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            scenes: {
              include: { shots: true },
            },
          },
        }),
        prisma.project.count({ where }),
      ]);

      return { items: items as unknown as Project[], total, page, limit };
    }

    // In-memory fallback
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

  async getById(id: string): Promise<Project | undefined> {
    if (prisma) {
      const project = await prisma.project.findUnique({
        where: { id, deletedAt: null },
        include: {
          scenes: {
            include: { shots: true },
          },
        },
      });
      return (project ?? undefined) as Project | undefined;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (project && project.status === "deleted") return undefined;
    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project | undefined> {
    if (prisma) {
      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await prisma.project.update({
        where: { id },
        data: { ...input },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
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

  async softDelete(id: string): Promise<boolean> {
    if (prisma) {
      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return false;

      await prisma.project.update({
        where: { id },
        data: {
          status: "deleted",
          deletedAt: new Date(),
        },
      });
      return true;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === "deleted") return false;

    project.status = "deleted";
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return true;
  },

  async updateWorldBible(
    id: string,
    worldBible: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (prisma) {
      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await prisma.project.update({
        where: { id },
        data: { worldBible: worldBible as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.worldBible = worldBible;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  async updateBrandKit(
    id: string,
    brandKit: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (prisma) {
      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await prisma.project.update({
        where: { id },
        data: { brandKit: brandKit as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.brandKit = brandKit;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  async updateStyleLock(
    id: string,
    styleLock: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (prisma) {
      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await prisma.project.update({
        where: { id },
        data: { styleLock: styleLock as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === "deleted") return undefined;

    project.styleLock = styleLock;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  /** Resets the in-memory store -- for testing only. */
  resetStore(): void {
    projects.clear();
  },
};
