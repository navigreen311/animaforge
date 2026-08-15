import type { Request, Response } from 'express';
import { sceneService } from '../services/sceneService.js';
import { CreateSceneSchema, UpdateSceneSchema } from '../models/sceneSchemas.js';
import * as apiResponse from '../utils/apiResponse.js';

export const sceneController = {
  async create(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const input = CreateSceneSchema.parse(req.body);
    const scene = await sceneService.create(projectId, input);
    apiResponse.success(res, scene, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const scenes = await sceneService.listByProject(projectId);
    apiResponse.success(res, scenes);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const input = UpdateSceneSchema.parse(req.body);
    const scene = await sceneService.update(id, input);
    if (!scene) {
      apiResponse.error(res, 'NOT_FOUND', 'Scene not found', 404);
      return;
    }
    apiResponse.success(res, scene);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const deleted = await sceneService.delete(id);
    if (!deleted) {
      apiResponse.error(res, 'NOT_FOUND', 'Scene not found', 404);
      return;
    }
    apiResponse.success(res, { deleted: true });
  },
};
