/**
 * Embedding Service — mock vector embedding generation
 * Produces deterministic 1536-dimensional vectors from text using hash-based seeding.
 */

export const EMBEDDING_DIM = 1536;

/**
 * Simple deterministic hash that produces a numeric seed from a string.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normalize a vector to unit length.
 */
function normalize(vec: number[]): number[] {
  let mag = 0;
  for (const v of vec) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag === 0) return vec;
  return vec.map((v) => v / mag);
}

/**
 * Generate a deterministic mock embedding for the given text.
 * The same text always produces the same vector.
 */
export function embedText(text: string): number[] {
  const seed = hashCode(text.toLowerCase().trim());
  const rng = seededRandom(seed);
  const raw: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    raw.push(rng() * 2 - 1); // values in [-1, 1)
  }
  return normalize(raw);
}

/**
 * Generate a deterministic mock CLIP-style image embedding for the given URL.
 */
export function embedImage(imageUrl: string): number[] {
  // Prefix ensures image embeddings differ from text embeddings of the same string
  return embedText(`__clip_image__:${imageUrl}`);
}

/**
 * Batch-embed an array of texts. Returns embeddings in the same order.
 */
export function embedBatch(texts: string[]): number[][] {
  return texts.map(embedText);
}
