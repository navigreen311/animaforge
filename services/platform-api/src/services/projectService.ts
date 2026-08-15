import { v4 as uuidv4 } from 'uuid';
import { isDatabaseReachable, requirePrisma } from '../db.js';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../models/projectSchemas.js';

import type { Prisma } from '@prisma/client';
// In-memory fallback store
const projects = new Map<string, Project>();

export const projectService = {
  async create(input: CreateProjectInput, ownerId?: string): Promise<Project> {
    // Project.ownerId is a required column. It was never passed here, so this
    // create could only ever have failed at runtime. With no owner there is
    // nothing valid to write, so fall through to the in-memory store.
    if ((await isDatabaseReachable()) && ownerId) {
      return requirePrisma().project.create({
        data: {
          ownerId,
          title: input.title,
          description: input.description ?? '',
          status: 'active',
          worldBible: {},
          brandKit: {},
          styleLock: {},
        } as Prisma.ProjectUncheckedCreateInput,
      }) as unknown as Project;
    }

    // In-memory fallback
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      title: input.title,
      description: input.description ?? '',
      status: 'active',
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
    if (await isDatabaseReachable()) {
      const where: Record<string, unknown> = { deletedAt: null };
      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        requirePrisma().project.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            scenes: {
              include: { shots: true },
            },
          },
        }),
        requirePrisma().project.count({ where }),
      ]);

      return { items: items as unknown as Project[], total, page, limit };
    }

    // In-memory fallback
    let items = Array.from(projects.values()).filter((p) => p.status !== 'deleted');

    if (status) {
      items = items.filter((p) => p.status === status);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return { items: paged, total, page, limit };
  },

  async getById(id: string): Promise<Project | undefined> {
    if (await isDatabaseReachable()) {
      const project = await requirePrisma().project.findUnique({
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
    if (project && project.status === 'deleted') return undefined;
    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project | undefined> {
    if (await isDatabaseReachable()) {
      const existing = await requirePrisma().project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await requirePrisma().project.update({
        where: { id },
        data: { ...input },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === 'deleted') return undefined;

    const updated: Project = {
      ...project,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    projects.set(id, updated);
    return updated;
  },

  async softDelete(id: string): Promise<boolean> {
    if (await isDatabaseReachable()) {
      const existing = await requirePrisma().project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return false;

      await requirePrisma().project.update({
        where: { id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
        },
      });
      return true;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === 'deleted') return false;

    project.status = 'deleted';
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return true;
  },

  async updateWorldBible(
    id: string,
    worldBible: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (await isDatabaseReachable()) {
      const existing = await requirePrisma().project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await requirePrisma().project.update({
        where: { id },
        data: { worldBible: worldBible as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === 'deleted') return undefined;

    project.worldBible = worldBible;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  async updateBrandKit(
    id: string,
    brandKit: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (await isDatabaseReachable()) {
      const existing = await requirePrisma().project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await requirePrisma().project.update({
        where: { id },
        data: { brandKit: brandKit as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === 'deleted') return undefined;

    project.brandKit = brandKit;
    project.updatedAt = new Date().toISOString();
    projects.set(id, project);
    return project;
  },

  async updateStyleLock(
    id: string,
    styleLock: Record<string, unknown>,
  ): Promise<Project | undefined> {
    if (await isDatabaseReachable()) {
      const existing = await requirePrisma().project.findUnique({
        where: { id, deletedAt: null },
      });
      if (!existing) return undefined;

      const updated = await requirePrisma().project.update({
        where: { id },
        data: { styleLock: styleLock as any },
      });
      return updated as unknown as Project;
    }

    // In-memory fallback
    const project = projects.get(id);
    if (!project || project.status === 'deleted') return undefined;

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
