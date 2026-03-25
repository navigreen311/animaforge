import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  search as searchInMemory,
  searchByVector,
  indexDocument,
  bulkIndex,
  removeDocument,
  getIndexStats,
  getDocument,
} from "../services/searchService";
import {
  searchDocuments as esSearch,
  indexDocument as esIndex,
  deleteDocument as esDelete,
  knnSearch,
  getClusterHealth,
} from "../services/elasticsearchClient";

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

// GET /search?q=query&type=&page=&limit= - semantic search with ES fallback
router.get("/", async (req: Request, res: Response) => {
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

  // Try Elasticsearch first, fall back to in-memory
  const esResult = await esSearch(type || "search", q, type ? { type } : undefined, page, limit);
  if (esResult) {
    return res.json({
      results: esResult.hits,
      total: esResult.total,
      page,
      limit,
      source: "elasticsearch",
    });
  }

  const result = searchInMemory(q, { type: type as any, page, limit });
  return res.json({ ...result, source: "in-memory" });
});

// POST /search/index - index document with optional embedding
router.post("/index", async (req: Request, res: Response) => {
  const parsed = indexSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const doc = indexDocument(parsed.data);

  // Also index to Elasticsearch (fire-and-forget)
  esIndex(parsed.data.type, doc.id, {
    content: doc.content,
    type: doc.type,
    metadata: doc.metadata,
    created_at: doc.indexedAt,
  }).catch(() => {});

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

  // Also index each to Elasticsearch (fire-and-forget)
  for (const doc of docs) {
    esIndex(doc.type, doc.id, {
      content: doc.content,
      type: doc.type,
      metadata: doc.metadata,
      created_at: doc.indexedAt,
    }).catch(() => {});
  }

  return res.status(201).json({
    indexed: docs.length,
    ids: docs.map((d) => d.id),
  });
});

// DELETE /search/index/:id
router.delete("/index/:id", async (req: Request, res: Response) => {
  const removed = removeDocument(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Also delete from Elasticsearch (fire-and-forget)
  esDelete("search", req.params.id).catch(() => {});

  return res.status(204).send();
});

// GET /search/stats - index statistics
router.get("/stats", (req: Request, res: Response) => {
  const stats = getIndexStats();
  return res.json(stats);
});

// GET /search/health - Elasticsearch cluster health
router.get("/health", async (_req: Request, res: Response) => {
  const health = await getClusterHealth();
  return res.json(health);
});

// POST /search/similar/:id - find similar documents (KNN with ES fallback)
router.post("/similar/:id", async (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string | undefined;
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid type. Must be one of: " + validTypes.join(", ") });
  }

  // Try KNN search via Elasticsearch first
  const knnResult = await knnSearch(type || "search", doc.embedding, limit + 1);
  if (knnResult) {
    const filtered = knnResult.hits.filter((h: any) => h.id !== doc.id).slice(0, limit);
    return res.json({ results: filtered, source: "elasticsearch" });
  }

  // Fall back to in-memory vector search
  const results = searchByVector(doc.embedding, {
    type: type as any,
    limit: limit + 1,
  });

  const filtered = results.filter((r) => r.id !== doc.id).slice(0, limit);
  return res.json({ results: filtered, source: "in-memory" });
});

export default router;
