import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnected = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (client && isConnected) return client;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    client = createClient({ url });
    client.on('error', (err) => {
      console.error('Redis error:', err.message);
      isConnected = false;
    });
    client.on('connect', () => { isConnected = true; });
    client.on('disconnect', () => { isConnected = false; });
    await client.connect();
    return client;
  } catch (err) {
    console.warn('Redis unavailable, falling back to in-memory:', (err as Error).message);
    return null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
  }
}

// Session store helpers
export async function setSession(userId: string, token: string, ttl = 86400): Promise<void> {
  const redis = await getRedisClient();
  if (redis) await redis.setEx(`session:${userId}`, ttl, token);
}

export async function getSession(userId: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  return redis.get(`session:${userId}`);
}

export async function deleteSession(userId: string): Promise<void> {
  const redis = await getRedisClient();
  if (redis) await redis.del(`session:${userId}`);
}

// Token blacklist
export async function blacklistToken(token: string, ttl = 86400): Promise<void> {
  const redis = await getRedisClient();
  if (redis) await redis.setEx(`blacklist:${token}`, ttl, '1');
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  return (await redis.get(`blacklist:${token}`)) === '1';
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key: string, value: unknown, ttl = 3600): Promise<void> {
  const redis = await getRedisClient();
  if (redis) await redis.setEx(key, ttl, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (redis) await redis.del(key);
}

// Rate limiting
export async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<{allowed: boolean; remaining: number; resetAt: number}> {
  const redis = await getRedisClient();
  if (!redis) return { allowed: true, remaining: limit, resetAt: Date.now() + windowSec * 1000 };

  const current = await redis.incr(`ratelimit:${key}`);
  if (current === 1) await redis.expire(`ratelimit:${key}`, windowSec);
  const ttl = await redis.ttl(`ratelimit:${key}`);

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt: Date.now() + ttl * 1000,
  };
}
