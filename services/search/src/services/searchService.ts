import { v4 as uuidv4 } from "uuid";
import {
  embedText,
  embedBatch,
  EMBEDDING_DIM,
} from "./embeddingService";
import prisma from "../db";

export type SearchableType = "shots" | "characters" | "assets" | "projects";

export interface SearchDocument {
  id: string;
  type: SearchableType;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  indexedAt: string;
}

export interface SearchResult {
  id: string;
  type: SearchableType;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

const documents = new Map<string, SearchDocument>();

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vector length mismatch: " + vecA.length + " vs " + vecB.length);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.min(1, Math.max(-1, dot / denom));
}

export function generateEmbedding(text: string): number[] {
  return embedText(text);
}

export function indexDocument(data: {
  id?: string;
  type: SearchableType;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}): SearchDocument {
  const embedding = data.embedding ?? generateEmbedding(data.content);
  const doc: SearchDocument = {
    id: data.id ?? uuidv4(),
    type: data.type,
    content: data.content,
    metadata: data.metadata ?? {},
    embedding,
    indexedAt: new Date().toISOString(),
  };
  documents.set(doc.id, doc);

  if (prisma?.searchDocument) {
    prisma.searchDocument
      .upsert({
        where: { id: doc.id },
        update: { type: doc.type, content: doc.content, metadata: doc.metadata, embedding: doc.embedding, indexedAt: doc.indexedAt },
        create: { id: doc.id, type: doc.type, content: doc.content, metadata: doc.metadata, embedding: doc.embedding, indexedAt: doc.indexedAt },
      })
      .catch(() => {});
  }

  return doc;
}

export function bulkIndex(
  items: { id?: string; type: SearchableType; content: string; metadata?: Record<string, unknown>; embedding?: number[] }[]
): SearchDocument[] {
  const textsToEmbed: string[] = [];
  const needsEmbedding: number[] = [];
  items.forEach((item, idx) => {
    if (!item.embedding) {
      textsToEmbed.push(item.content);
      needsEmbedding.push(idx);
    }
  });
  const batchEmbeddings = embedBatch(textsToEmbed);
  let embIdx = 0;
  const enriched = items.map((item, idx) => {
    if (needsEmbedding.includes(idx)) {
      return { ...item, embedding: batchEmbeddings[embIdx++] };
    }
    return item;
  });
  return enriched.map((item) => indexDocument(item));
}

export function removeDocument(id: string): boolean {
  const removed = documents.delete(id);
  if (removed && prisma?.searchDocument) {
    prisma.searchDocument.delete({ where: { id } }).catch(() => {});
  }
  return removed;
}

export function search(
  query: string,
  options: { type?: SearchableType; page?: number; limit?: number } = {}
): { results: SearchResult[]; total: number; page: number; limit: number } {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  if (!query || query.trim().length === 0) {
    return { results: [], total: 0, page, limit };
  }
  const queryEmbedding = generateEmbedding(query);
  const scored: SearchResult[] = [];
  for (const doc of documents.values()) {
    if (options.type && doc.type !== options.type) continue;
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    scored.push({ id: doc.id, type: doc.type, content: doc.content, score, metadata: doc.metadata });
  }
  scored.sort((a, b) => b.score - a.score);
  const total = scored.length;
  const start = (page - 1) * limit;
  const paginated = scored.slice(start, start + limit);
  return { results: paginated, total, page, limit };
}

export function searchByVector(
  embedding: number[],
  options: { type?: SearchableType; limit?: number } = {}
): SearchResult[] {
  const limit = options.limit ?? 20;
  const scored: SearchResult[] = [];
  for (const doc of documents.values()) {
    if (options.type && doc.type !== options.type) continue;
    const score = cosineSimilarity(embedding, doc.embedding);
    scored.push({ id: doc.id, type: doc.type, content: doc.content, score, metadata: doc.metadata });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function getIndexStats(): {
  total_docs: number;
  by_type: Record<SearchableType, number>;
  avg_embedding_dim: number;
} {
  const byType: Record<SearchableType, number> = { shots: 0, characters: 0, assets: 0, projects: 0 };
  let dimSum = 0;
  for (const doc of documents.values()) {
    byType[doc.type] = (byType[doc.type] || 0) + 1;
    dimSum += doc.embedding.length;
  }
  return {
    total_docs: documents.size,
    by_type: byType,
    avg_embedding_dim: documents.size > 0 ? dimSum / documents.size : 0,
  };
}

export function reindexAll(): number {
  const texts: string[] = [];
  const ids: string[] = [];
  for (const doc of documents.values()) {
    texts.push(doc.content);
    ids.push(doc.id);
  }
  const newEmbeddings = embedBatch(texts);
  for (let i = 0; i < ids.length; i++) {
    const doc = documents.get(ids[i]);
    if (doc) {
      doc.embedding = newEmbeddings[i];
    }
  }
  return ids.length;
}

export function clearAll(): void {
  documents.clear();
}

export function getDocument(id: string): SearchDocument | undefined {
  return documents.get(id);
}
