import { Router } from "express";
import { sceneController } from "../controllers/sceneController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { CreateSceneSchema, UpdateSceneSchema, ProjectParamsSchema, SceneParamsSchema } from "../models/sceneSchemas.js";

const router = Router();

router.post(
  "/projects/:projectId/scenes",
  requireAuth,
  validate(ProjectParamsSchema, "params"),
  validate(CreateSceneSchema, "body"),
  sceneController.create,
);

router.get(
  "/projects/:projectId/scenes",
  requireAuth,
  validate(ProjectParamsSchema, "params"),
  sceneController.list,
);

router.put(
  "/scenes/:id",
  requireAuth,
  validate(SceneParamsSchema, "params"),
  validate(UpdateSceneSchema, "body"),
  sceneController.update,
);

router.delete(
  "/scenes/:id",
  requireAuth,
  validate(SceneParamsSchema, "params"),
  sceneController.delete,
);

export default router;
