import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  search as searchDocuments,
  indexDocument,
  removeDocument,
} from "../services/searchService";

const router = Router();

const indexSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["shots", "characters", "assets", "projects"]),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// GET /search?q=query&type=shots|characters|assets|projects&page&limit
router.get("/", (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const type = req.query.type as string | undefined;
  const validTypes = ["shots", "characters", "assets", "projects"];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = searchDocuments(q, {
    type: type as any,
    page,
    limit,
  });

  return res.json(result);
});

// POST /search/index
router.post("/index", (req: Request, res: Response) => {
  const parsed = indexSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const doc = indexDocument(parsed.data);
  return res.status(201).json(doc);
});

// DELETE /search/index/:id
router.delete("/index/:id", (req: Request, res: Response) => {
  const removed = removeDocument(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "Document not found" });
  }
  return res.status(204).send();
});

export default router;
