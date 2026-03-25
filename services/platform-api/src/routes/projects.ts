import { Router } from "express";
import { projectController } from "../controllers/projectController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createProjectSchema,
  updateProjectSchema,
  listQuerySchema,
  worldBibleSchema,
  brandKitSchema,
  styleLockSchema,
} from "../models/projectSchemas.js";

const router = Router();

router.post(
  "/projects",
  requireAuth,
  validate(createProjectSchema, "body"),
  projectController.create,
);

router.get(
  "/projects",
  requireAuth,
  validate(listQuerySchema, "query"),
  projectController.list,
);

router.get(
  "/projects/:id",
  requireAuth,
  projectController.getById,
);

router.put(
  "/projects/:id",
  requireAuth,
  validate(updateProjectSchema, "body"),
  projectController.update,
);

router.delete(
  "/projects/:id",
  requireAuth,
  projectController.delete,
);

router.put(
  "/projects/:id/world-bible",
  requireAuth,
  validate(worldBibleSchema, "body"),
  projectController.updateWorldBible,
);

router.put(
  "/projects/:id/brand-kit",
  requireAuth,
  validate(brandKitSchema, "body"),
  projectController.updateBrandKit,
);

router.put(
  "/projects/:id/style-lock",
  requireAuth,
  validate(styleLockSchema, "body"),
  projectController.updateStyleLock,
);

export default router;
