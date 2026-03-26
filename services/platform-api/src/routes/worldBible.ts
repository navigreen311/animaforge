import { Router, Request, Response, NextFunction } from "express";
import * as wbs from "../services/worldBibleService.js";

const router = Router();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// POST /api/v1/projects/:projectId/world-bible/create
router.post(
  "/projects/:projectId/world-bible/create",
  asyncHandler(async (req, res) => {
    const bible = await wbs.createWorldBible(req.params.projectId, req.body);
    res.status(201).json({ success: true, data: bible });
  }),
);

// PUT /api/v1/projects/:projectId/world-bible/section/:section
router.put(
  "/projects/:projectId/world-bible/section/:section",
  asyncHandler(async (req, res) => {
    const bible = await wbs.updateSection(
      req.params.projectId,
      req.params.section as keyof wbs.WorldBibleSections,
      req.body.data,
    );
    res.status(200).json({ success: true, data: bible });
  }),
);

// POST /api/v1/projects/:projectId/world-bible/validate
router.post(
  "/projects/:projectId/world-bible/validate",
  asyncHandler(async (req, res) => {
    const result = await wbs.validateConsistency(req.params.projectId);
    res.status(200).json({ success: true, data: result });
  }),
);

// POST /api/v1/projects/:projectId/world-bible/enforce
router.post(
  "/projects/:projectId/world-bible/enforce",
  asyncHandler(async (req, res) => {
    const result = await wbs.enforceConstraints(
      req.params.projectId,
      req.body,
    );
    res.status(200).json({ success: true, data: result });
  }),
);

// POST /api/v1/projects/:projectId/world-bible/generate
router.post(
  "/projects/:projectId/world-bible/generate",
  asyncHandler(async (req, res) => {
    const result = await wbs.generateFromDescription(
      req.params.projectId,
      req.body.description,
    );
    res.status(200).json({ success: true, data: result });
  }),
);

// GET /api/v1/projects/:projectId/world-bible/character/:name
router.get(
  "/projects/:projectId/world-bible/character/:name",
  asyncHandler(async (req, res) => {
    const profile = await wbs.getCharacterProfile(
      req.params.projectId,
      req.params.name,
    );
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Character not found in World Bible" },
      });
      return;
    }
    res.status(200).json({ success: true, data: profile });
  }),
);

// GET /api/v1/projects/:projectId/world-bible/location/:name
router.get(
  "/projects/:projectId/world-bible/location/:name",
  asyncHandler(async (req, res) => {
    const details = await wbs.getLocationDetails(
      req.params.projectId,
      req.params.name,
    );
    if (!details) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Location not found in World Bible" },
      });
      return;
    }
    res.status(200).json({ success: true, data: details });
  }),
);

// POST /api/v1/projects/:projectId/world-bible/rules
router.post(
  "/projects/:projectId/world-bible/rules",
  asyncHandler(async (req, res) => {
    const rule = await wbs.addRule(req.params.projectId, req.body);
    res.status(201).json({ success: true, data: rule });
  }),
);

// POST /api/v1/projects/:projectId/world-bible/check-scene
router.post(
  "/projects/:projectId/world-bible/check-scene",
  asyncHandler(async (req, res) => {
    const result = await wbs.checkSceneAgainstBible(
      req.params.projectId,
      req.body,
    );
    res.status(200).json({ success: true, data: result });
  }),
);

// GET /api/v1/projects/:projectId/world-bible/export
router.get(
  "/projects/:projectId/world-bible/export",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) || "json";
    const result = await wbs.exportBible(
      req.params.projectId,
      format as "json" | "markdown" | "pdf",
    );
    res.status(200).json({ success: true, data: result });
  }),
);

export default router;
