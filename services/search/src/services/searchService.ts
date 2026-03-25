import { v4 as uuidv4 } from "uuid";

export type SearchableType = "shots" | "characters" | "assets" | "projects";

export interface SearchDocument {
  id: string;
  type: SearchableType;
  content: string;
  metadata: Record<string, unknown>;
  indexedAt: string;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
}

// In-memory index
const documents = new Map<string, SearchDocument>();

export function indexDocument(data: {
  id?: string;
  type: SearchableType;
  content: string;
  metadata?: Record<string, unknown>;
}): SearchDocument {
  const doc: SearchDocument = {
    id: data.id || uuidv4(),
    type: data.type,
    content: data.content,
    metadata: data.metadata || {},
    indexedAt: new Date().toISOString(),
  };

  documents.set(doc.id, doc);
  return doc;
}

export function removeDocument(id: string): boolean {
  return documents.delete(id);
}

export function search(
  query: string,
  options: { type?: SearchableType; page?: number; limit?: number }
): { results: SearchResult[]; total: number; page: number; limit: number } {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];

  for (const doc of documents.values()) {
    // Filter by type if specified
    if (options.type && doc.type !== options.type) continue;

    const contentLower = doc.content.toLowerCase();
    const metadataStr = JSON.stringify(doc.metadata).toLowerCase();

    // Calculate relevance score
    let score = 0;

    // Exact substring match in content (highest weight)
    if (contentLower.includes(queryLower)) {
      score += 10;
    }

    // Individual term matches
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        score += 3;
        // Bonus for term appearing at the start
        if (contentLower.startsWith(term)) {
          score += 2;
        }
      }
      // Metadata match (lower weight)
      if (metadataStr.includes(term)) {
        score += 1;
      }
    }

    // Term frequency bonus
    for (const term of queryTerms) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = doc.content.match(regex);
      if (matches) {
        score += Math.min(matches.length * 0.5, 5);
      }
    }

    if (score > 0) {
      results.push({ document: doc, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const total = results.length;
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  return { results: paginated, total, page, limit };
}

export function clearAll(): void {
  documents.clear();
}
