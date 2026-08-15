import type { Request, Response } from 'express';
import { shotService } from '../services/shotService.js';
import { sceneService } from '../services/sceneService.js';
import { CreateShotSchema, UpdateShotSchema } from '../models/shotSchemas.js';
import * as apiResponse from '../utils/apiResponse.js';

export const shotController = {
  async create(req: Request, res: Response): Promise<void> {
    const { sceneId } = req.params;
    const scene = await sceneService.getById(sceneId);
    if (!scene) {
      apiResponse.error(res, 'NOT_FOUND', 'Scene not found', 404);
      return;
    }
    const input = CreateShotSchema.parse(req.body);
    const shot = await shotService.create(sceneId, scene.projectId, input);
    apiResponse.success(res, shot, 201);
  },

  async listByProject(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const shots = await shotService.listByProject(projectId);
    apiResponse.success(res, shots);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    apiResponse.success(res, shot);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    if (shot.status === 'locked') {
      apiResponse.error(res, 'LOCKED', 'Shot is locked and cannot be modified', 409);
      return;
    }
    const input = UpdateShotSchema.parse(req.body);
    const updated = await shotService.update(id, input);
    apiResponse.success(res, updated);
  },

  async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    if (shot.status === 'locked') {
      apiResponse.error(res, 'LOCKED', 'Shot is locked and cannot be modified', 409);
      return;
    }
    const userId = req.user?.id ?? 'system';
    const approved = await shotService.approve(id, userId);
    apiResponse.success(res, approved);
  },

  async reject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    if (shot.status === 'locked') {
      apiResponse.error(res, 'LOCKED', 'Shot is locked and cannot be modified', 409);
      return;
    }
    const { rejectionReason } = req.body ?? {};
    const rejected = await shotService.reject(id, rejectionReason);
    apiResponse.success(res, rejected);
  },

  async lock(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    const locked = await shotService.lock(id);
    apiResponse.success(res, locked);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const shot = await shotService.getById(id);
    if (!shot) {
      apiResponse.error(res, 'NOT_FOUND', 'Shot not found', 404);
      return;
    }
    if (shot.status === 'locked') {
      apiResponse.error(res, 'LOCKED', 'Shot is locked and cannot be deleted', 409);
      return;
    }
    await shotService.delete(id);
    apiResponse.success(res, { deleted: true });
  },
};
