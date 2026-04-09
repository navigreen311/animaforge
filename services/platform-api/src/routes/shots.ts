import { Router } from "express";
import { shotController } from "../controllers/shotController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  CreateShotSchema,
  UpdateShotSchema,
  ShotParamsSchema,
  SceneParamsSchema,
  ProjectParamsSchema,
} from "../models/shotSchemas.js";

const router = Router();

router.post(
  "/scenes/:sceneId/shots",
  requireAuth,
  validate(SceneParamsSchema, "params"),
  validate(CreateShotSchema, "body"),
  shotController.create,
);

router.get(
  "/projects/:projectId/shots",
  requireAuth,
  validate(ProjectParamsSchema, "params"),
  shotController.listByProject,
);

router.get(
  "/shots/:id",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  shotController.getById,
);

router.put(
  "/shots/:id",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  validate(UpdateShotSchema, "body"),
  shotController.update,
);

router.put(
  "/shots/:id/approve",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  shotController.approve,
);

router.put(
  "/shots/:id/reject",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  shotController.reject,
);

router.put(
  "/shots/:id/lock",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  shotController.lock,
);

router.delete(
  "/shots/:id",
  requireAuth,
  validate(ShotParamsSchema, "params"),
  shotController.delete,
);

export default router;
