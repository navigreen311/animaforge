import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import {
  clearAssetMemory,
  indexAssetWithEmbedding,
  findSimilarAssets,
  findByDescription,
  getAssetRecommendations,
  trackAssetUsage,
  getMostUsedAssets,
  getRelatedAssets,
  reindexProject,
  cosineSimilarity,
  generateAssetEmbedding,
} from "../services/assetMemory";
import { EMBEDDING_DIM } from "../services/embeddingService";

describe("Deep Asset Memory with Vector Similarity", () => {
  beforeEach(() => {
    clearAssetMemory();
  });

  // 1. Index an asset with embedding
  it("should index an asset and generate an embedding", () => {
    const asset = indexAssetWithEmbedding({
      name: "Hero Sword",
      type: "prop",
      projectId: "proj-1",
      metadata: { material: "steel", style: "medieval" },
    });

    expect(asset.id).toBeDefined();
    expect(asset.name).toBe("Hero Sword");
    expect(asset.type).toBe("prop");
    expect(asset.projectId).toBe("proj-1");
    expect(asset.embedding).toHaveLength(EMBEDDING_DIM);
    expect(asset.indexedAt).toBeDefined();

    // Verify cosine similarity with itself via regenerated embedding
    const emb = generateAssetEmbedding("Hero Sword", "prop", {
      material: "steel",
      style: "medieval",
    });
    expect(cosineSimilarity(asset.embedding, emb)).toBeCloseTo(1.0, 5);
  });

  // 2. Find similar assets using cosine similarity
  it("should find similar assets by vector similarity", () => {
    const sword = indexAssetWithEmbedding({
      name: "Hero Sword",
      type: "prop",
      projectId: "proj-1",
      metadata: { material: "steel" },
    });
    indexAssetWithEmbedding({
      name: "Villain Blade",
      type: "prop",
      projectId: "proj-1",
      metadata: { material: "dark steel" },
    });
    indexAssetWithEmbedding({
      name: "Forest Background",
      type: "environment",
      projectId: "proj-1",
      metadata: { biome: "forest" },
    });

    const similar = findSimilarAssets(sword.id, 10);
    expect(similar.length).toBe(2);
    // All results should have valid similarity scores
    for (const r of similar) {
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    // Source asset should not appear in results
    const ids = similar.map((r) => r.id);
    expect(ids).not.toContain(sword.id);
  });

  // 3. Semantic search by description
  it("should find assets by natural language description", () => {
    indexAssetWithEmbedding({
      name: "Dragon Character Rig",
      type: "character",
      projectId: "proj-1",
      metadata: { species: "dragon" },
    });
    indexAssetWithEmbedding({
      name: "Castle Tower",
      type: "environment",
      projectId: "proj-1",
      metadata: { style: "gothic" },
    });

    const results = findByDescription("dragon", undefined, 20);
    expect(results.length).toBe(2);
    // The dragon asset should rank higher
    expect(results[0].name).toBe("Dragon Character Rig");

    // Filter by type
    const envOnly = findByDescription("castle", "environment", 20);
    expect(envOnly.length).toBe(1);
    expect(envOnly[0].type).toBe("environment");
  });

  // 4. Asset recommendations based on project context
  it("should recommend assets based on project context", () => {
    indexAssetWithEmbedding({
      name: "Medieval Shield",
      type: "prop",
      projectId: "proj-1",
      metadata: { style: "medieval" },
    });
    indexAssetWithEmbedding({
      name: "Sci-Fi Blaster",
      type: "prop",
      projectId: "proj-2",
      metadata: { style: "sci-fi" },
    });

    const recs = getAssetRecommendations("proj-1", {
      style: "medieval",
      scene: "castle courtyard",
    });
    expect(recs.length).toBe(2);
    // Each recommendation should have a reason
    for (const r of recs) {
      expect(r.reason).toBeDefined();
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  // 5. Track asset usage
  it("should track asset usage records", () => {
    const asset = indexAssetWithEmbedding({
      name: "Explosion VFX",
      type: "vfx",
      projectId: "proj-1",
    });

    const record = trackAssetUsage(asset.id, "proj-1", "shot-1");
    expect(record.assetId).toBe(asset.id);
    expect(record.projectId).toBe("proj-1");
    expect(record.shotId).toBe("shot-1");
    expect(record.timestamp).toBeDefined();

    trackAssetUsage(asset.id, "proj-1", "shot-2");
    trackAssetUsage(asset.id, "proj-1", "shot-3");

    const popular = getMostUsedAssets("proj-1");
    expect(popular.length).toBe(1);
    expect(popular[0].usageCount).toBe(3);
    expect(popular[0].asset.id).toBe(asset.id);
  });

  // 6. Most popular assets in a project
  it("should return the most popular assets in a project", () => {
    const a1 = indexAssetWithEmbedding({
      name: "Asset A",
      type: "prop",
      projectId: "proj-1",
    });
    const a2 = indexAssetWithEmbedding({
      name: "Asset B",
      type: "prop",
      projectId: "proj-1",
    });

    // Asset A used 3 times, Asset B used 1 time
    trackAssetUsage(a1.id, "proj-1", "s1");
    trackAssetUsage(a1.id, "proj-1", "s2");
    trackAssetUsage(a1.id, "proj-1", "s3");
    trackAssetUsage(a2.id, "proj-1", "s1");

    const popular = getMostUsedAssets("proj-1", 10);
    expect(popular.length).toBe(2);
    expect(popular[0].asset.id).toBe(a1.id);
    expect(popular[0].usageCount).toBe(3);
    expect(popular[1].asset.id).toBe(a2.id);
    expect(popular[1].usageCount).toBe(1);
  });

  // 7. Related assets via collaborative filtering
  it("should find related assets using collaborative filtering", () => {
    const sword = indexAssetWithEmbedding({
      name: "Sword",
      type: "prop",
      projectId: "proj-1",
    });
    const shield = indexAssetWithEmbedding({
      name: "Shield",
      type: "prop",
      projectId: "proj-1",
    });
    const helmet = indexAssetWithEmbedding({
      name: "Helmet",
      type: "prop",
      projectId: "proj-1",
    });
    const tree = indexAssetWithEmbedding({
      name: "Tree",
      type: "environment",
      projectId: "proj-1",
    });

    // Sword and Shield used together in shot-1 and shot-2
    trackAssetUsage(sword.id, "proj-1", "shot-1");
    trackAssetUsage(shield.id, "proj-1", "shot-1");
    trackAssetUsage(sword.id, "proj-1", "shot-2");
    trackAssetUsage(shield.id, "proj-1", "shot-2");
    trackAssetUsage(helmet.id, "proj-1", "shot-2");
    // Tree used in shot-3 alone
    trackAssetUsage(tree.id, "proj-1", "shot-3");

    const related = getRelatedAssets(sword.id);
    expect(related.length).toBe(2); // shield and helmet
    // Shield should be the most related (2 co-occurrences)
    expect(related[0].id).toBe(shield.id);
    expect(related[0].coOccurrences).toBe(2);
    expect(related[1].id).toBe(helmet.id);
    expect(related[1].coOccurrences).toBe(1);
    // Tree should not appear (different shot)
    const relatedIds = related.map((r) => r.id);
    expect(relatedIds).not.toContain(tree.id);
  });

  // 8. Reindex project assets
  it("should reindex all assets for a project", () => {
    indexAssetWithEmbedding({
      name: "Asset X",
      type: "prop",
      projectId: "proj-1",
      metadata: { color: "red" },
    });
    indexAssetWithEmbedding({
      name: "Asset Y",
      type: "prop",
      projectId: "proj-1",
      metadata: { color: "blue" },
    });
    indexAssetWithEmbedding({
      name: "Other Project Asset",
      type: "prop",
      projectId: "proj-2",
    });

    const count = reindexProject("proj-1");
    expect(count).toBe(2); // Only proj-1 assets reindexed

    // Reindexing a non-existent project returns 0
    const count2 = reindexProject("proj-nonexistent");
    expect(count2).toBe(0);
  });
});
