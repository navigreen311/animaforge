import type { Request, Response } from "express";
import { projectService } from "../services/projectService.js";
import {
  createProjectSchema,
  updateProjectSchema,
  worldBibleSchema,
  brandKitSchema,
  styleLockSchema,
  listQuerySchema,
} from "../models/projectSchemas.js";
import * as apiResponse from "../utils/apiResponse.js";

export const projectController = {
  create(req: Request, res: Response): void {
    const input = createProjectSchema.parse(req.body);
    const project = projectService.create(input);
    apiResponse.success(res, project, 201);
  },

  list(req: Request, res: Response): void {
    const query = listQuerySchema.parse(req.query);
    const result = projectService.list(query.page, query.limit, query.status);
    apiResponse.success(res, result);
  },

  getById(req: Request, res: Response): void {
    const { id } = req.params;
    const project = projectService.getById(id);
    if (!project) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, project);
  },

  update(req: Request, res: Response): void {
    const { id } = req.params;
    const input = updateProjectSchema.parse(req.body);
    const project = projectService.update(id, input);
    if (!project) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, project);
  },

  delete(req: Request, res: Response): void {
    const { id } = req.params;
    const deleted = projectService.softDelete(id);
    if (!deleted) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, { deleted: true });
  },

  updateWorldBible(req: Request, res: Response): void {
    const { id } = req.params;
    const data = worldBibleSchema.parse(req.body);
    const project = projectService.updateWorldBible(id, data);
    if (!project) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, project);
  },

  updateBrandKit(req: Request, res: Response): void {
    const { id } = req.params;
    const data = brandKitSchema.parse(req.body);
    const project = projectService.updateBrandKit(id, data);
    if (!project) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, project);
  },

  updateStyleLock(req: Request, res: Response): void {
    const { id } = req.params;
    const data = styleLockSchema.parse(req.body);
    const project = projectService.updateStyleLock(id, data);
    if (!project) {
      apiResponse.error(res, "NOT_FOUND", "Project not found", 404);
      return;
    }
    apiResponse.success(res, project);
  },
};
