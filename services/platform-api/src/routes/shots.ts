import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { shotController } from '../controllers/shotController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  CreateShotSchema,
  UpdateShotSchema,
  ShotParamsSchema,
  SceneParamsSchema,
  ProjectParamsSchema,
} from '../models/shotSchemas.js';

const router = Router();

router.post(
  '/scenes/:sceneId/shots',
  requireAuth,
  validate(SceneParamsSchema, 'params'),
  validate(CreateShotSchema, 'body'),
  asyncHandler(shotController.create),
);

router.get(
  '/projects/:projectId/shots',
  requireAuth,
  validate(ProjectParamsSchema, 'params'),
  asyncHandler(shotController.listByProject),
);

router.get(
  '/shots/:id',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  asyncHandler(shotController.getById),
);

router.put(
  '/shots/:id',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  validate(UpdateShotSchema, 'body'),
  asyncHandler(shotController.update),
);

router.put(
  '/shots/:id/approve',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  asyncHandler(shotController.approve),
);

router.put(
  '/shots/:id/reject',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  asyncHandler(shotController.reject),
);

router.put(
  '/shots/:id/lock',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  asyncHandler(shotController.lock),
);

router.delete(
  '/shots/:id',
  requireAuth,
  validate(ShotParamsSchema, 'params'),
  asyncHandler(shotController.delete),
);

export default router;
