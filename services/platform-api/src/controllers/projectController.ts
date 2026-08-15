import type { Request, Response } from 'express';
import { projectService } from '../services/projectService.js';
import {
  createProjectSchema,
  updateProjectSchema,
  worldBibleSchema,
  brandKitSchema,
  styleLockSchema,
  listQuerySchema,
} from '../models/projectSchemas.js';
import * as apiResponse from '../utils/apiResponse.js';

export const projectController = {
  async create(req: Request, res: Response): Promise<void> {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(input, req.user?.id);
    apiResponse.success(res, project, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = listQuerySchema.parse(req.query);
    const result = await projectService.list(query.page, query.limit, query.status);
    apiResponse.success(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const project = await projectService.getById(id);
    if (!project) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, project);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(id, input);
    if (!project) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, project);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const deleted = await projectService.softDelete(id);
    if (!deleted) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, { deleted: true });
  },

  async updateWorldBible(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = worldBibleSchema.parse(req.body);
    const project = await projectService.updateWorldBible(id, data);
    if (!project) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, project);
  },

  async updateBrandKit(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = brandKitSchema.parse(req.body);
    const project = await projectService.updateBrandKit(id, data);
    if (!project) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, project);
  },

  async updateStyleLock(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = styleLockSchema.parse(req.body);
    const project = await projectService.updateStyleLock(id, data);
    if (!project) {
      apiResponse.error(res, 'NOT_FOUND', 'Project not found', 404);
      return;
    }
    apiResponse.success(res, project);
  },
};
