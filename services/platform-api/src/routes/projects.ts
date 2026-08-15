import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { projectController } from '../controllers/projectController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listQuerySchema,
  worldBibleSchema,
  brandKitSchema,
  styleLockSchema,
} from '../models/projectSchemas.js';

const router = Router();

router.post(
  '/projects',
  requireAuth,
  validate(createProjectSchema, 'body'),
  asyncHandler(projectController.create),
);

router.get(
  '/projects',
  requireAuth,
  validate(listQuerySchema, 'query'),
  asyncHandler(projectController.list),
);

router.get('/projects/:id', requireAuth, asyncHandler(projectController.getById));

router.put(
  '/projects/:id',
  requireAuth,
  validate(updateProjectSchema, 'body'),
  asyncHandler(projectController.update),
);

router.delete('/projects/:id', requireAuth, asyncHandler(projectController.delete));

router.put(
  '/projects/:id/world-bible',
  requireAuth,
  validate(worldBibleSchema, 'body'),
  asyncHandler(projectController.updateWorldBible),
);

router.put(
  '/projects/:id/brand-kit',
  requireAuth,
  validate(brandKitSchema, 'body'),
  asyncHandler(projectController.updateBrandKit),
);

router.put(
  '/projects/:id/style-lock',
  requireAuth,
  validate(styleLockSchema, 'body'),
  asyncHandler(projectController.updateStyleLock),
);

export default router;
