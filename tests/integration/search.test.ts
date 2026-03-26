/**
 * Integration tests — Search API
 *
 * Tests the /search endpoints through the search Express app,
 * covering indexing, semantic search, filtering, bulk operations,
 * document removal, and similarity ranking.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { clearAll } from '../../services/search/src/services/searchService';

let searchApp: any;

async function getSearchApp() {
  if (!searchApp) {
    const mod = await import('../../services/search/src/index');
    searchApp = (mod as any).app ?? mod.default;
  }
  return searchApp;
}

// Reset in-memory search index before each test
beforeEach(() => {
  clearAll();
});

describe('Search API', () => {
  // 1. Index document -> searchable
  it('should index a document and make it searchable', async () => {
    const app = await getSearchApp();

    const indexRes = await request(app)
      .post('/search/index')
      .send({
        type: 'shots',
        content: 'A hero walking through a dark forest at sunset',
        metadata: { scene: 'opening', mood: 'dramatic' },
      });

    expect(indexRes.status).toBe(201);
    expect(indexRes.body.id).toBeDefined();
    expect(indexRes.body.type).toBe('shots');

    // Search for it
    const searchRes = await request(app)
      .get('/search?q=hero+forest+sunset');

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.results.length).toBeGreaterThanOrEqual(1);

    const found = searchRes.body.results.find(
      (r: any) => r.id === indexRes.body.id,
    );
    expect(found).toBeDefined();
    expect(found.score).toBeGreaterThan(0);
  });

  // 2. Semantic search -> ranked results
  it('should return ranked results for semantic search', async () => {
    const app = await getSearchApp();

    // Index documents with varying relevance
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A car chase scene through a neon city at night',
    });
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A peaceful garden with birds singing in the morning',
    });
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A high-speed motorcycle pursuit in urban streets',
    });

    const res = await request(app).get('/search?q=fast+vehicle+chase+city');

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(3);
    // Results should be ranked by score descending
    for (let i = 0; i < res.body.results.length - 1; i++) {
      expect(res.body.results[i].score).toBeGreaterThanOrEqual(
        res.body.results[i + 1].score,
      );
    }
  });

  // 3. Filter by type -> correct filtering
  it('should filter search results by type', async () => {
    const app = await getSearchApp();

    await request(app).post('/search/index').send({
      type: 'characters',
      content: 'A brave warrior with a flaming sword',
    });
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A warrior swinging a flaming sword in battle',
    });
    await request(app).post('/search/index').send({
      type: 'assets',
      content: 'Flaming sword 3D model asset',
    });

    const res = await request(app).get('/search?q=warrior+sword&type=characters');

    expect(res.status).toBe(200);
    // All results should be of type 'characters'
    for (const result of res.body.results) {
      expect(result.type).toBe('characters');
    }
    expect(res.body.results.length).toBe(1);
  });

  // 4. Bulk index -> all indexed
  it('should bulk index multiple documents', async () => {
    const app = await getSearchApp();

    const documents = [
      { type: 'projects' as const, content: 'Sci-fi epic about space exploration' },
      { type: 'projects' as const, content: 'Romantic comedy in 1920s Paris' },
      { type: 'projects' as const, content: 'Horror anthology in a haunted mansion' },
    ];

    const res = await request(app)
      .post('/search/bulk-index')
      .send({ documents });

    expect(res.status).toBe(201);
    expect(res.body.indexed).toBe(3);
    expect(res.body.ids).toHaveLength(3);

    // Verify stats reflect all documents
    const statsRes = await request(app).get('/search/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.total_docs).toBe(3);
    expect(statsRes.body.by_type.projects).toBe(3);
  });

  // 5. Remove document -> no longer found
  it('should remove a document so it is no longer searchable', async () => {
    const app = await getSearchApp();

    const indexRes = await request(app)
      .post('/search/index')
      .send({
        type: 'assets',
        content: 'A unique crystal dragon model for deletion test',
      });

    const docId = indexRes.body.id;

    // Confirm it exists
    const searchBefore = await request(app).get('/search?q=crystal+dragon');
    expect(searchBefore.body.results.length).toBe(1);

    // Remove
    const deleteRes = await request(app).delete(`/search/index/${docId}`);
    expect(deleteRes.status).toBe(204);

    // Confirm it is gone
    const searchAfter = await request(app).get('/search?q=crystal+dragon');
    expect(searchAfter.body.results.length).toBe(0);
  });

  // 6. Similar documents -> cosine similarity ranking
  it('should find similar documents ranked by cosine similarity', async () => {
    const app = await getSearchApp();

    // Index several documents
    const baseRes = await request(app).post('/search/index').send({
      type: 'shots',
      content: 'An astronaut floating in zero gravity inside a space station',
    });
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A cosmonaut performing a spacewalk above planet Earth',
    });
    await request(app).post('/search/index').send({
      type: 'shots',
      content: 'A medieval knight jousting at a tournament',
    });

    const baseId = baseRes.body.id;

    // Find similar to the astronaut document
    const res = await request(app).post(`/search/similar/${baseId}`);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    // The base document itself should NOT be in results
    const selfMatch = res.body.results.find((r: any) => r.id === baseId);
    expect(selfMatch).toBeUndefined();
    // Results should be ordered by descending score
    for (let i = 0; i < res.body.results.length - 1; i++) {
      expect(res.body.results[i].score).toBeGreaterThanOrEqual(
        res.body.results[i + 1].score,
      );
    }
  });
});
