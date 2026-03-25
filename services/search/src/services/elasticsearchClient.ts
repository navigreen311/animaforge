/**
 * Elasticsearch Client — wraps ES connectivity with an in-memory fallback.
 *
 * When ELASTICSEARCH_URL is reachable, delegates to the real cluster.
 * Otherwise, provides a fully functional in-memory search engine so the
 * service can run without external dependencies.
 */

export interface ESFieldMapping {
  type: string;
  analyzer?: string;
  fields?: Record<string, { type: string; analyzer?: string }>;
}

export interface ESIndexMappings {
  properties: Record<string, ESFieldMapping>;
}

export interface ESSearchHit {
  _id: string;
  _source: Record<string, unknown>;
  _score: number;
  highlight?: Record<string, string[]>;
}

export interface ESSearchResult {
  hits: ESSearchHit[];
  total: number;
  page: number;
  limit: number;
}

export interface ESClusterHealth {
  status: "green" | "yellow" | "red" | "unavailable";
  numberOfNodes: number;
  activeShards: number;
  using: "elasticsearch" | "in-memory";
}

// ---------------------------------------------------------------------------
// In-memory store that mirrors the ES API surface
// ---------------------------------------------------------------------------
interface InMemoryIndex {
  mappings: ESIndexMappings;
  documents: Map<string, Record<string, unknown>>;
}

const indices = new Map<string, InMemoryIndex>();
let esAvailable = false;
let esUrl: string | null = null;

// ---------------------------------------------------------------------------
// ElasticsearchClient class
// ---------------------------------------------------------------------------
export class ElasticsearchClient {
  private baseUrl: string;

  constructor(url?: string) {
    this.baseUrl = url || process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    esUrl = this.baseUrl;
    this.checkConnection();
  }

  // ---- Connection check (best-effort, non-blocking) -----------------------
  private async checkConnection(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/_cluster/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      esAvailable = res.ok;
    } catch {
      esAvailable = false;
    }
  }

  // ---- Index management ---------------------------------------------------
  async createIndex(name: string, mappings: ESIndexMappings): Promise<boolean> {
    if (esAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/${name}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings }),
        });
        if (res.ok) return true;
      } catch {
        // fall through to in-memory
      }
    }

    // In-memory fallback
    if (!indices.has(name)) {
      indices.set(name, { mappings, documents: new Map() });
    }
    return true;
  }

  // ---- Document indexing --------------------------------------------------
  async indexDocument(
    index: string,
    id: string,
    body: Record<string, unknown>
  ): Promise<{ _id: string; result: string }> {
    this.ensureIndex(index);

    if (esAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/${index}/_doc/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          // Mirror to in-memory for consistency
          indices.get(index)!.documents.set(id, body);
          return { _id: data._id, result: data.result };
        }
      } catch {
        // fall through
      }
    }

    // In-memory fallback
    const idx = indices.get(index)!;
    const existed = idx.documents.has(id);
    idx.documents.set(id, body);
    return { _id: id, result: existed ? "updated" : "created" };
  }

  // ---- Search -------------------------------------------------------------
  async search(
    index: string,
    query: string,
    filters: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ESSearchResult> {
    this.ensureIndex(index);

    if (esAvailable) {
      try {
        const from = (page - 1) * limit;
        const must: any[] = [
          { multi_match: { query, fields: ["*"], fuzziness: "AUTO" } },
        ];
        const filterClauses: any[] = Object.entries(filters).map(([field, value]) => ({
          term: { [field]: value },
        }));

        const esQuery = {
          from,
          size: limit,
          query: {
            bool: { must, filter: filterClauses },
          },
          highlight: { fields: { "*": {} } },
        };

        const res = await fetch(`${this.baseUrl}/${index}/_search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(esQuery),
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          const hits: ESSearchHit[] = (data.hits?.hits || []).map((h: any) => ({
            _id: h._id,
            _source: h._source,
            _score: h._score,
            highlight: h.highlight,
          }));
          const total =
            typeof data.hits?.total === "number"
              ? data.hits.total
              : data.hits?.total?.value ?? 0;
          return { hits, total, page, limit };
        }
      } catch {
        // fall through
      }
    }

    // In-memory fallback — simple text matching
    return this.inMemorySearch(index, query, filters, page, limit);
  }

  // ---- Delete document ----------------------------------------------------
  async deleteDocument(
    index: string,
    id: string
  ): Promise<boolean> {
    if (esAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/${index}/_doc/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          indices.get(index)?.documents.delete(id);
          return true;
        }
      } catch {
        // fall through
      }
    }

    const idx = indices.get(index);
    if (!idx) return false;
    return idx.documents.delete(id);
  }

  // ---- Bulk index ---------------------------------------------------------
  async bulkIndex(
    index: string,
    documents: { id: string; body: Record<string, unknown> }[]
  ): Promise<{ indexed: number; errors: number }> {
    this.ensureIndex(index);
    let indexed = 0;
    let errors = 0;

    if (esAvailable) {
      try {
        const lines: string[] = [];
        for (const doc of documents) {
          lines.push(JSON.stringify({ index: { _index: index, _id: doc.id } }));
          lines.push(JSON.stringify(doc.body));
        }
        const body = lines.join("\n") + "\n";

        const res = await fetch(`${this.baseUrl}/_bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/x-ndjson" },
          body,
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          for (const item of data.items || []) {
            if (item.index?.error) {
              errors++;
            } else {
              indexed++;
            }
          }
          // Mirror to in-memory
          for (const doc of documents) {
            indices.get(index)!.documents.set(doc.id, doc.body);
          }
          return { indexed, errors };
        }
      } catch {
        // fall through
      }
    }

    // In-memory fallback
    const idx = indices.get(index)!;
    for (const doc of documents) {
      try {
        idx.documents.set(doc.id, doc.body);
        indexed++;
      } catch {
        errors++;
      }
    }
    return { indexed, errors };
  }

  // ---- Cluster health -----------------------------------------------------
  async getClusterHealth(): Promise<ESClusterHealth> {
    if (esAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/_cluster/health`);
        if (res.ok) {
          const data = (await res.json()) as any;
          return {
            status: data.status,
            numberOfNodes: data.number_of_nodes,
            activeShards: data.active_primary_shards,
            using: "elasticsearch",
          };
        }
      } catch {
        // fall through
      }
    }

    return {
      status: "unavailable",
      numberOfNodes: 0,
      activeShards: 0,
      using: "in-memory",
    };
  }

  // ---- In-memory search implementation ------------------------------------
  private inMemorySearch(
    index: string,
    query: string,
    filters: Record<string, unknown>,
    page: number,
    limit: number
  ): ESSearchResult {
    const idx = indices.get(index);
    if (!idx) return { hits: [], total: 0, page, limit };

    const queryLower = query.toLowerCase();
    const scored: ESSearchHit[] = [];

    for (const [id, doc] of idx.documents) {
      // Apply filters
      let passesFilters = true;
      for (const [field, value] of Object.entries(filters)) {
        if (doc[field] !== value) {
          passesFilters = false;
          break;
        }
      }
      if (!passesFilters) continue;

      // Text matching across all string fields
      let score = 0;
      const highlight: Record<string, string[]> = {};

      for (const [field, value] of Object.entries(doc)) {
        if (typeof value === "string") {
          const valueLower = value.toLowerCase();
          if (valueLower.includes(queryLower)) {
            score += 1;
            // Build highlight snippet
            const idx = valueLower.indexOf(queryLower);
            const start = Math.max(0, idx - 30);
            const end = Math.min(value.length, idx + queryLower.length + 30);
            const snippet = value.substring(start, end);
            const highlighted = snippet.replace(
              new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
              (match) => `<em>${match}</em>`
            );
            highlight[field] = [highlighted];
          }
        }
      }

      if (score > 0) {
        scored.push({ _id: id, _source: doc, _score: score, highlight });
      }
    }

    scored.sort((a, b) => b._score - a._score);
    const total = scored.length;
    const start = (page - 1) * limit;
    const paginated = scored.slice(start, start + limit);

    return { hits: paginated, total, page, limit };
  }

  // ---- Helpers ------------------------------------------------------------
  private ensureIndex(name: string): void {
    if (!indices.has(name)) {
      indices.set(name, {
        mappings: { properties: {} },
        documents: new Map(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Default singleton instance
// ---------------------------------------------------------------------------
export const esClient = new ElasticsearchClient();

// ---------------------------------------------------------------------------
// Utility for tests — clear all in-memory indices
// ---------------------------------------------------------------------------
export function clearAllIndices(): void {
  indices.clear();
}
