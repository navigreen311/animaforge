import { Router, type Request, type Response } from "express";
import * as brandKitService from "../services/brandKitService.js";

const router = Router();

// POST /api/v1/projects/:projectId/brand-kit — create / set brand kit
router.post("/projects/:projectId/brand-kit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const kit = await brandKitService.createBrandKit(projectId, req.body);
    res.status(201).json(kit);
  } catch (err) {
    res.status(500).json({ error: "Failed to create brand kit" });
  }
});

// GET /api/v1/projects/:projectId/brand-kit — get brand kit
router.get("/projects/:projectId/brand-kit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const kit = await brandKitService.getBrandKit(projectId);
    if (!kit) {
      res.status(404).json({ error: "Brand kit not found" });
      return;
    }
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: "Failed to get brand kit" });
  }
});

// PUT /api/v1/projects/:projectId/brand-kit — update brand kit
router.put("/projects/:projectId/brand-kit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const kit = await brandKitService.updateBrandKit(projectId, req.body);
    if (!kit) {
      res.status(404).json({ error: "Brand kit not found" });
      return;
    }
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: "Failed to update brand kit" });
  }
});

// POST /api/v1/projects/:projectId/brand-kit/validate — validate output compliance
router.post("/projects/:projectId/brand-kit/validate", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { outputUrl } = req.body;
    const result = await brandKitService.validateBrandConsistency(projectId, outputUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to validate brand consistency" });
  }
});

// POST /api/v1/projects/:projectId/brand-kit/guide — generate brand guide
router.post("/projects/:projectId/brand-kit/guide", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const guide = await brandKitService.generateBrandGuide(projectId);
    if (!guide) {
      res.status(404).json({ error: "Brand kit not found" });
      return;
    }
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate brand guide" });
  }
});

// POST /api/v1/projects/:projectId/brand-kit/apply — apply brand to output
router.post("/projects/:projectId/brand-kit/apply", async (req: Request, res: Response) => {
  try {
    const { outputUrl, brandKitId } = req.body;
    const result = await brandKitService.applyBrandToOutput(outputUrl, brandKitId);
    if (!result.applied) {
      res.status(404).json({ error: "Brand kit not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to apply brand to output" });
  }
});

export default router;
