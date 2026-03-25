import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  search as searchDocuments,
  searchByVector,
  indexDocument,
  bulkIndex,
  removeDocument,
  getIndexStats,
  getDocument,
} from "../services/searchService";

const router = Router();

const indexSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["shots", "characters", "assets", "projects"]),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
});

const bulkIndexSchema = z.object({
  documents: z.array(indexSchema).min(1),
});

const validTypes = ["shots", "characters", "assets", "projects"];

// GET /search?q=query&type=&page=&limit= - semantic search
router.get("/", (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const type = req.query.type as string | undefined;
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid type. Must be one of: " + validTypes.join(", ") });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = searchDocuments(q, { type: type as any, page, limit });
  return res.json(result);
});

// POST /search/index - index document with optional embedding
router.post("/index", (req: Request, res: Response) => {
  const parsed = indexSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const doc = indexDocument(parsed.data);
  return res.status(201).json({
    id: doc.id,
    type: doc.type,
    content: doc.content,
    metadata: doc.metadata,
    indexedAt: doc.indexedAt,
  });
});

// POST /search/bulk-index - batch index
router.post("/bulk-index", (req: Request, res: Response) => {
  const parsed = bulkIndexSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const docs = bulkIndex(parsed.data.documents);
  return res.status(201).json({
    indexed: docs.length,
    ids: docs.map((d) => d.id),
  });
});

// DELETE /search/index/:id
router.delete("/index/:id", (req: Request, res: Response) => {
  const removed = removeDocument(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "Document not found" });
  }
  return res.status(204).send();
});

// GET /search/stats - index statistics
router.get("/stats", (req: Request, res: Response) => {
  const stats = getIndexStats();
  return res.json(stats);
});

// POST /search/similar/:id - find similar documents
router.post("/similar/:id", (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string | undefined;
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid type. Must be one of: " + validTypes.join(", ") });
  }

  const results = searchByVector(doc.embedding, {
    type: type as any,
    limit: limit + 1,
  });

  // Remove the source document from results
  const filtered = results.filter((r) => r.id !== doc.id).slice(0, limit);
  return res.json({ results: filtered });
});

export default router;
