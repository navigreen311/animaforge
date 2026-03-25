import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import {
  clearAll,
  indexDocument,
  search,
  searchByVector,
  cosineSimilarity,
  generateEmbedding,
  getIndexStats,
} from "../services/searchService";
import { EMBEDDING_DIM } from "../services/embeddingService";

describe("Semantic Vector Search", () => {
  beforeEach(() => {
    clearAll();
  });

  // 1. Index a document and verify embedding is generated
  it("should index a document with auto-generated embedding", async () => {
    const res = await request(app).post("/search/index").send({
      type: "shots",
      content: "A beautiful sunset scene with warm golden colors",
      metadata: { style: "cinematic" },
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe("shots");

    // Verify the internal document has an embedding via search
    const results = search("A beautiful sunset scene with warm golden colors", {});
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].id).toBe(res.body.id);
    // Exact same text should produce cosine similarity of 1.0
    expect(results.results[0].score).toBeCloseTo(1.0, 5);
  });

  // 2. Search by text using semantic similarity (cosine)
  it("should search documents by text using cosine similarity", () => {
    const doc1 = indexDocument({
      type: "shots",
      content: "A beautiful sunset scene with warm colors",
    });
    indexDocument({
      type: "characters",
      content: "A warrior character with heavy armor and a sword",
    });
    indexDocument({
      type: "assets",
      content: "Mountain landscape with snow peaks",
    });

    // Searching with the exact content should yield that doc with score ~1.0
    const results = search("A beautiful sunset scene with warm colors", {});
    expect(results.results.length).toBe(3);
    expect(results.results[0].id).toBe(doc1.id);
    expect(results.results[0].score).toBeCloseTo(1.0, 5);
    // All results should have valid similarity scores in [-1, 1]
    for (const r of results.results) {
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  // 3. Search by type filter
  it("should filter search results by type", () => {
    indexDocument({
      type: "shots",
      content: "Dragon flying over mountains",
    });
    indexDocument({
      type: "characters",
      content: "Dragon warrior character with fire breath",
    });

    const results = search("dragon", { type: "characters" });
    expect(results.results.length).toBe(1);
    expect(results.results[0].type).toBe("characters");
  });

  // 4. Pagination
  it("should paginate search results", () => {
    for (let i = 0; i < 5; i++) {
      indexDocument({
        type: "shots",
        content: "Scene number " + i + " with action and drama",
      });
    }

    const page1 = search("scene action", { page: 1, limit: 2 });
    expect(page1.results.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);

    const page2 = search("scene action", { page: 2, limit: 2 });
    expect(page2.results.length).toBe(2);
    expect(page2.page).toBe(2);

    // IDs should not overlap between pages
    const page1Ids = page1.results.map((r) => r.id);
    const page2Ids = page2.results.map((r) => r.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  // 5. Find similar documents via API
  it("should find similar documents to a given document", async () => {
    const doc1 = indexDocument({
      type: "shots",
      content: "A bright sunny day at the beach with waves",
    });
    indexDocument({
      type: "shots",
      content: "Ocean waves crashing on a sandy shore",
    });
    indexDocument({
      type: "characters",
      content: "A dark medieval knight in a dungeon",
    });

    const res = await request(app).post("/search/similar/" + doc1.id);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(2);
    // Source document should NOT appear in results
    const ids = res.body.results.map((r: any) => r.id);
    expect(ids).not.toContain(doc1.id);
  });

  // 6. Bulk index
  it("should bulk-index multiple documents", async () => {
    const res = await request(app)
      .post("/search/bulk-index")
      .send({
        documents: [
          { type: "shots", content: "Explosion in a city" },
          { type: "characters", content: "Robot character" },
          { type: "assets", content: "Futuristic car model" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.indexed).toBe(3);
    expect(res.body.ids).toHaveLength(3);

    const stats = getIndexStats();
    expect(stats.total_docs).toBe(3);
  });

  // 7. Remove a document
  it("should remove a document from the index", async () => {
    const doc = indexDocument({
      type: "assets",
      content: "A golden sword prop for the hero",
    });

    const del = await request(app).delete("/search/index/" + doc.id);
    expect(del.status).toBe(204);

    const stats = getIndexStats();
    expect(stats.total_docs).toBe(0);

    const results = search("golden sword", {});
    expect(results.results).toHaveLength(0);
  });

  // 8. Index statistics
  it("should return correct index statistics", async () => {
    indexDocument({ type: "shots", content: "Scene one" });
    indexDocument({ type: "shots", content: "Scene two" });
    indexDocument({ type: "characters", content: "Hero character" });
    indexDocument({ type: "assets", content: "Sword asset" });

    const res = await request(app).get("/search/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_docs).toBe(4);
    expect(res.body.by_type.shots).toBe(2);
    expect(res.body.by_type.characters).toBe(1);
    expect(res.body.by_type.assets).toBe(1);
    expect(res.body.by_type.projects).toBe(0);
    expect(res.body.avg_embedding_dim).toBe(EMBEDDING_DIM);
  });

  // 9. Empty query returns 400
  it("should return 400 for empty query", async () => {
    const res = await request(app).get("/search?q=");
    expect(res.status).toBe(400);

    const res2 = await request(app).get("/search");
    expect(res2.status).toBe(400);
  });

  // 10. Direct vector search
  it("should search by raw vector embedding", () => {
    const doc1 = indexDocument({
      type: "shots",
      content: "Rainy night in the city with neon lights",
    });
    indexDocument({
      type: "shots",
      content: "Bright sunny afternoon in a park",
    });

    // Use the embedding of doc1 to find itself as the top match
    const queryVec = generateEmbedding("Rainy night in the city with neon lights");
    expect(queryVec).toHaveLength(EMBEDDING_DIM);

    const results = searchByVector(queryVec, { limit: 10 });
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(doc1.id);
    expect(results[0].score).toBeCloseTo(1.0, 5);
    expect(results[0].score).toBeGreaterThan(results[1].score);

    // Cosine similarity of a vector with itself should be ~1
    const selfSim = cosineSimilarity(queryVec, queryVec);
    expect(selfSim).toBeCloseTo(1.0, 5);
  });
});
