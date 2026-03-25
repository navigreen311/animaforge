import type { Request, Response } from "express";
import { sceneService } from "../services/sceneService.js";
import { CreateSceneSchema, UpdateSceneSchema } from "../models/sceneSchemas.js";
import * as apiResponse from "../utils/apiResponse.js";

export const sceneController = {
  create(req: Request, res: Response): void {
    const { projectId } = req.params;
    const input = CreateSceneSchema.parse(req.body);
    const scene = sceneService.create(projectId, input);
    apiResponse.success(res, scene, 201);
  },

  list(req: Request, res: Response): void {
    const { projectId } = req.params;
    const scenes = sceneService.listByProject(projectId);
    apiResponse.success(res, scenes);
  },

  update(req: Request, res: Response): void {
    const { id } = req.params;
    const input = UpdateSceneSchema.parse(req.body);
    const scene = sceneService.update(id, input);
    if (!scene) {
      apiResponse.error(res, "NOT_FOUND", "Scene not found", 404);
      return;
    }
    apiResponse.success(res, scene);
  },

  delete(req: Request, res: Response): void {
    const { id } = req.params;
    const deleted = sceneService.delete(id);
    if (!deleted) {
      apiResponse.error(res, "NOT_FOUND", "Scene not found", 404);
      return;
    }
    apiResponse.success(res, { deleted: true });
  },
};
