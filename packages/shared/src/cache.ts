/**
 * AnimaForge — Two-tier caching layer
 * L1: In-memory LRU cache (Map-based, max 2 000 entries)
 * L2: Redis fallback (optional — degrades gracefully when unavailable)
 */

import { createRedisClient } from './redis';

// ---------------------------------------------------------------------------
// L1 — LRU Cache
// ---------------------------------------------------------------------------

export class LRUCache<V = unknown> {
  private map = new Map<string, V>();
  private readonly maxSize: number;

  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
  }

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Move to end (most-recently used)
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict the least-recently used (first entry)
      const firstKey = this.map.keys().next().value as string;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}

// ---------------------------------------------------------------------------
// Singleton L1 cache instance
// ---------------------------------------------------------------------------

const l1 = new LRUCache<string>(2000);

// ---------------------------------------------------------------------------
// Redis L2 helpers (best-effort)
// ---------------------------------------------------------------------------

let redisClient: ReturnType<typeof createRedisClient> | null = null;

function getRedis() {
  if (!redisClient) {
    try {
      redisClient = createRedisClient();
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

async function redisGet(key: string): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return await (redis as any).get(key);
  } catch {
    return null;
  }
}

async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    if (ttlSeconds) {
      await (redis as any).set(key, value, 'EX', ttlSeconds);
    } else {
      await (redis as any).set(key, value);
    }
  } catch {
    // Redis unavailable — L1 still works
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await (redis as any).del(key);
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a cached value. Checks L1 first, then L2 (Redis).
 * On L2 hit the value is promoted back into L1.
 */
export async function cacheGet(key: string): Promise<string | null> {
  // L1
  const l1Hit = l1.get(key);
  if (l1Hit !== undefined) return l1Hit;

  // L2
  const l2Hit = await redisGet(key);
  if (l2Hit !== null) {
    l1.set(key, l2Hit); // promote
  }
  return l2Hit;
}

/**
 * Store a value in both L1 and L2.
 * @param ttlSeconds  Optional TTL applied to the Redis entry only.
 */
export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  l1.set(key, value);
  await redisSet(key, value, ttlSeconds);
}

/**
 * Remove a key from both L1 and L2.
 */
export async function cacheInvalidate(key: string): Promise<void> {
  l1.delete(key);
  await redisDel(key);
}
