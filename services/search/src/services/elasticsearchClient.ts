import { Client } from '@elastic/elasticsearch';

let esClient: Client | null = null;

export function getESClient(): Client | null {
  if (esClient) return esClient;
  const url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  try {
    esClient = new Client({ node: url });
    return esClient;
  } catch (err) {
    console.warn('Elasticsearch unavailable:', (err as Error).message);
    return null;
  }
}

const INDEX_PREFIX = 'animaforge';

export async function createIndex(type: string, mappings?: Record<string, any>): Promise<boolean> {
  const client = getESClient();
  if (!client) return false;
  const indexName = `${INDEX_PREFIX}-${type}`;
  try {
    const exists = await client.indices.exists({ index: indexName });
    if (!exists) {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: mappings || {
            properties: {
              content: { type: 'text', analyzer: 'standard' },
              type: { type: 'keyword' },
              metadata: { type: 'object', enabled: true },
              embedding: { type: 'dense_vector', dims: 1536, index: true, similarity: 'cosine' },
              created_at: { type: 'date' },
            }
          }
        }
      });
    }
    return true;
  } catch (err) {
    console.warn('ES createIndex failed:', (err as Error).message);
    return false;
  }
}

export async function indexDocument(type: string, id: string, body: Record<string, any>): Promise<boolean> {
  const client = getESClient();
  if (!client) return false;
  try {
    await client.index({ index: `${INDEX_PREFIX}-${type}`, id, body, refresh: 'wait_for' });
    return true;
  } catch (err) { console.warn('ES index failed:', (err as Error).message); return false; }
}

export async function searchDocuments(type: string, query: string, filters?: Record<string, any>, page = 1, limit = 20) {
  const client = getESClient();
  if (!client) return null; // Caller falls back to in-memory
  try {
    const must: any[] = [{ multi_match: { query, fields: ['content^3', 'metadata.*'] } }];
    if (filters?.type) must.push({ term: { type: filters.type } });

    const result = await client.search({
      index: `${INDEX_PREFIX}-${type}`,
      body: {
        query: { bool: { must } },
        from: (page - 1) * limit,
        size: limit,
        highlight: { fields: { content: {} } },
      }
    });
    return {
      hits: result.hits.hits.map((h: any) => ({ id: h._id, score: h._score, ...h._source, highlight: h.highlight })),
      total: (result.hits.total as any).value,
    };
  } catch (err) { console.warn('ES search failed:', (err as Error).message); return null; }
}

export async function deleteDocument(type: string, id: string): Promise<boolean> {
  const client = getESClient();
  if (!client) return false;
  try { await client.delete({ index: `${INDEX_PREFIX}-${type}`, id }); return true; }
  catch { return false; }
}

export async function knnSearch(type: string, vector: number[], k = 10) {
  const client = getESClient();
  if (!client) return null;
  try {
    const result = await client.search({
      index: `${INDEX_PREFIX}-${type}`,
      body: { knn: { field: 'embedding', query_vector: vector, k, num_candidates: k * 10 } }
    });
    return { hits: result.hits.hits.map((h: any) => ({ id: h._id, score: h._score, ...h._source })) };
  } catch { return null; }
}

export async function getClusterHealth() {
  const client = getESClient();
  if (!client) return { status: 'unavailable' };
  try { return await client.cluster.health(); }
  catch { return { status: 'error' }; }
}
