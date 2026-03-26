/**
 * Deep Asset Memory Service — vector similarity, recommendations, and collaborative filtering
 * Provides intelligent asset discovery using embeddings, usage tracking, and co-occurrence analysis.
 */

import { v4 as uuidv4 } from "uuid";
import { embedText, EMBEDDING_DIM } from "./embeddingService";
import { indexDocument as esIndexDocument } from "./elasticsearchClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AssetEntry {
  id: string;
  name: string;
  type: string;
  projectId: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  indexedAt: string;
}

export interface UsageRecord {
  assetId: string;
  projectId: string;
  shotId: string;
  timestamp: string;
}

export interface SimilarAssetResult {
  id: string;
  name: string;
  type: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface AssetRecommendation {
  id: string;
  name: string;
  type: string;
  score: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
const assetIndex = new Map<string, AssetEntry>();
const usageRecords: UsageRecord[] = [];

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch: " + a.length + " vs " + b.length);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.min(1, Math.max(-1, dot / denom));
}

export function generateAssetEmbedding(
  name: string,
  type: string,
  metadata: Record<string, unknown>
): number[] {
  const metaStr = Object.entries(metadata)
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(" ");
  const text = `${name} ${type} ${metaStr}`.trim();
  return embedText(text);
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Index an asset with its embedding into memory and Elasticsearch.
 */
export function indexAssetWithEmbedding(asset: {
  id?: string;
  name: string;
  type: string;
  projectId: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}): AssetEntry {
  const metadata = asset.metadata ?? {};
  const embedding =
    asset.embedding ?? generateAssetEmbedding(asset.name, asset.type, metadata);

  const entry: AssetEntry = {
    id: asset.id ?? uuidv4(),
    name: asset.name,
    type: asset.type,
    projectId: asset.projectId,
    metadata,
    embedding,
    indexedAt: new Date().toISOString(),
  };

  assetIndex.set(entry.id, entry);

  // Fire-and-forget ES index
  esIndexDocument("animaforge_assets", entry.id, {
    name: entry.name,
    type: entry.type,
    projectId: entry.projectId,
    metadata: entry.metadata,
    indexedAt: entry.indexedAt,
  }).catch(() => {});

  return entry;
}

/**
 * Find assets similar to the given asset using cosine similarity.
 */
export function findSimilarAssets(
  assetId: string,
  limit: number = 10
): SimilarAssetResult[] {
  const source = assetIndex.get(assetId);
  if (!source) return [];

  const scored: SimilarAssetResult[] = [];
  for (const entry of assetIndex.values()) {
    if (entry.id === assetId) continue;
    const score = cosineSimilarity(source.embedding, entry.embedding);
    scored.push({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      score,
      metadata: entry.metadata,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Semantic search by natural language description.
 */
export function findByDescription(
  description: string,
  type?: string,
  limit: number = 20
): SimilarAssetResult[] {
  if (!description || description.trim().length === 0) return [];

  const queryEmbedding = embedText(description);
  const scored: SimilarAssetResult[] = [];

  for (const entry of assetIndex.values()) {
    if (type && entry.type !== type) continue;
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    scored.push({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      score,
      metadata: entry.metadata,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Recommend assets based on project context — combines style similarity,
 * usage popularity, and context matching.
 */
export function getAssetRecommendations(
  projectId: string,
  context: { style?: string; character?: string; scene?: string }
): AssetRecommendation[] {
  // Build a context query embedding
  const contextParts: string[] = [];
  if (context.style) contextParts.push(`style:${context.style}`);
  if (context.character) contextParts.push(`character:${context.character}`);
  if (context.scene) contextParts.push(`scene:${context.scene}`);
  if (contextParts.length === 0) contextParts.push("general");

  const contextEmbedding = embedText(contextParts.join(" "));

  // Get project usage counts for popularity boost
  const projectUsage = new Map<string, number>();
  for (const rec of usageRecords) {
    if (rec.projectId === projectId) {
      projectUsage.set(rec.assetId, (projectUsage.get(rec.assetId) || 0) + 1);
    }
  }

  const recommendations: AssetRecommendation[] = [];

  for (const entry of assetIndex.values()) {
    const similarityScore = cosineSimilarity(contextEmbedding, entry.embedding);
    const usageCount = projectUsage.get(entry.id) || 0;
    // Blend similarity with a small popularity boost (log scale)
    const popularityBoost = usageCount > 0 ? Math.log2(usageCount + 1) * 0.05 : 0;
    const combinedScore = similarityScore * 0.85 + popularityBoost + (entry.projectId === projectId ? 0.1 : 0);

    let reason = "context similarity";
    if (usageCount > 0) reason = "frequently used + context match";
    if (entry.projectId === projectId) reason = "same project + " + reason;

    recommendations.push({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      score: Math.min(1, combinedScore),
      reason,
    });
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, 20);
}

/**
 * Record asset usage for learning.
 */
export function trackAssetUsage(
  assetId: string,
  projectId: string,
  shotId: string
): UsageRecord {
  const record: UsageRecord = {
    assetId,
    projectId,
    shotId,
    timestamp: new Date().toISOString(),
  };
  usageRecords.push(record);
  return record;
}

/**
 * Get the most frequently used assets in a project.
 */
export function getMostUsedAssets(
  projectId: string,
  limit: number = 10
): { asset: AssetEntry; usageCount: number }[] {
  const counts = new Map<string, number>();
  for (const rec of usageRecords) {
    if (rec.projectId === projectId) {
      counts.set(rec.assetId, (counts.get(rec.assetId) || 0) + 1);
    }
  }

  const entries = Array.from(counts.entries())
    .map(([assetId, usageCount]) => {
      const asset = assetIndex.get(assetId);
      return asset ? { asset, usageCount } : null;
    })
    .filter((e): e is { asset: AssetEntry; usageCount: number } => e !== null);

  entries.sort((a, b) => b.usageCount - a.usageCount);
  return entries.slice(0, limit);
}

/**
 * Get related assets using collaborative filtering — assets frequently used together.
 */
export function getRelatedAssets(
  assetId: string
): { id: string; name: string; type: string; coOccurrences: number }[] {
  // Find all shots where the target asset was used
  const shotIds = new Set<string>();
  for (const rec of usageRecords) {
    if (rec.assetId === assetId) {
      shotIds.add(rec.shotId);
    }
  }

  // Count co-occurrences of other assets in the same shots
  const coOccurrences = new Map<string, number>();
  for (const rec of usageRecords) {
    if (rec.assetId !== assetId && shotIds.has(rec.shotId)) {
      coOccurrences.set(
        rec.assetId,
        (coOccurrences.get(rec.assetId) || 0) + 1
      );
    }
  }

  const results = Array.from(coOccurrences.entries())
    .map(([id, count]) => {
      const asset = assetIndex.get(id);
      return asset
        ? { id: asset.id, name: asset.name, type: asset.type, coOccurrences: count }
        : null;
    })
    .filter(
      (e): e is { id: string; name: string; type: string; coOccurrences: number } =>
        e !== null
    );

  results.sort((a, b) => b.coOccurrences - a.coOccurrences);
  return results;
}

/**
 * Rebuild all embeddings for a project's assets.
 */
export function reindexProject(projectId: string): number {
  let count = 0;
  for (const entry of assetIndex.values()) {
    if (entry.projectId === projectId) {
      entry.embedding = generateAssetEmbedding(
        entry.name,
        entry.type,
        entry.metadata
      );
      entry.indexedAt = new Date().toISOString();
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Utilities (exposed for testing)
// ---------------------------------------------------------------------------
export function clearAssetMemory(): void {
  assetIndex.clear();
  usageRecords.length = 0;
}

export function getAsset(id: string): AssetEntry | undefined {
  return assetIndex.get(id);
}

export function getAssetIndexSize(): number {
  return assetIndex.size;
}

export function getUsageRecords(): UsageRecord[] {
  return usageRecords;
}
