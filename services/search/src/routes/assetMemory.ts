import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  indexAssetWithEmbedding,
  findSimilarAssets,
  findByDescription,
  getAssetRecommendations,
  trackAssetUsage,
  getMostUsedAssets,
  getRelatedAssets,
  reindexProject,
} from "../services/assetMemory";

const router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const indexAssetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  projectId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
});

const usageSchema = z.object({
  assetId: z.string().min(1),
  projectId: z.string().min(1),
  shotId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /search/assets/index — index asset with embedding
router.post("/index", (req: Request, res: Response) => {
  const parsed = indexAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const entry = indexAssetWithEmbedding(parsed.data);
  return res.status(201).json({
    id: entry.id,
    name: entry.name,
    type: entry.type,
    projectId: entry.projectId,
    metadata: entry.metadata,
    indexedAt: entry.indexedAt,
  });
});

// GET /search/assets/similar/:assetId — find similar
router.get("/similar/:assetId", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const results = findSimilarAssets(req.params.assetId, limit);
  return res.json({ results });
});

// GET /search/assets/describe?q=description — semantic search
router.get("/describe", (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }
  const type = req.query.type as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const results = findByDescription(q, type, limit);
  return res.json({ results });
});

// GET /search/assets/recommend/:projectId — AI recommendations
router.get("/recommend/:projectId", (req: Request, res: Response) => {
  const context = {
    style: req.query.style as string | undefined,
    character: req.query.character as string | undefined,
    scene: req.query.scene as string | undefined,
  };
  const recommendations = getAssetRecommendations(req.params.projectId, context);
  return res.json({ recommendations });
});

// POST /search/assets/usage — track usage
router.post("/usage", (req: Request, res: Response) => {
  const parsed = usageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const record = trackAssetUsage(
    parsed.data.assetId,
    parsed.data.projectId,
    parsed.data.shotId
  );
  return res.status(201).json(record);
});

// GET /search/assets/popular/:projectId — most used
router.get("/popular/:projectId", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const results = getMostUsedAssets(req.params.projectId, limit);
  return res.json({
    results: results.map((r) => ({
      id: r.asset.id,
      name: r.asset.name,
      type: r.asset.type,
      usageCount: r.usageCount,
    })),
  });
});

// GET /search/assets/related/:assetId — related assets
router.get("/related/:assetId", (req: Request, res: Response) => {
  const results = getRelatedAssets(req.params.assetId);
  return res.json({ results });
});

// POST /search/assets/reindex/:projectId — rebuild index
router.post("/reindex/:projectId", (req: Request, res: Response) => {
  const count = reindexProject(req.params.projectId);
  return res.json({ reindexed: count, projectId: req.params.projectId });
});

export default router;
