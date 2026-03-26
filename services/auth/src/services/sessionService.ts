import crypto from "crypto";
import { createClient, type RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: RedisClientType | null = null;
let redisAvailable = false;
let redisChecked = false;

async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient && redisAvailable) return redisClient;
  if (redisChecked && !redisAvailable) return null;

  try {
    redisChecked = true;
    redisClient = createClient({ url: REDIS_URL }) as RedisClientType;
    redisClient.on("error", () => {
      redisAvailable = false;
    });
    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch {
    console.warn("Redis unavailable \u2014 falling back to in-memory session store");
    redisAvailable = false;
    redisClient = null;
    return null;
  }
}

const memSessions = new Map<string, { token: string; expiresAt: number }>();
const memBlacklist = new Map<string, number>();

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function sessionKey(userId: string, hash: string): string {
  return `session:${userId}:${hash}`;
}

function blacklistKey(token: string): string {
  return `blacklist:${tokenHash(token)}`;
}

function pruneMemory(): void {
  const now = Date.now();
  for (const [key, val] of memSessions) {
    if (val.expiresAt <= now) memSessions.delete(key);
  }
  for (const [key, exp] of memBlacklist) {
    if (exp <= now) memBlacklist.delete(key);
  }
}

export async function createSession(
  userId: string,
  token: string,
  ttl: number = 86400,
): Promise<void> {
  const hash = tokenHash(token);
  const key = sessionKey(userId, hash);

  const redis = await getRedis();
  if (redis) {
    await redis.set(key, token, { EX: ttl });
    return;
  }

  memSessions.set(key, { token, expiresAt: Date.now() + ttl * 1000 });
}

export async function invalidateSession(
  token: string,
  ttl: number = 86400,
): Promise<void> {
  const bKey = blacklistKey(token);

  const redis = await getRedis();
  if (redis) {
    await redis.set(bKey, "1", { EX: ttl });
    return;
  }

  memBlacklist.set(bKey, Date.now() + ttl * 1000);
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const bKey = blacklistKey(token);

  const redis = await getRedis();
  if (redis) {
    const val = await redis.get(bKey);
    return val !== null;
  }

  pruneMemory();
  const entry = memBlacklist.get(bKey);
  if (!entry) return false;
  return entry > Date.now();
}

export async function getUserSessions(userId: string): Promise<string[]> {
  const prefix = `session:${userId}:`;

  const redis = await getRedis();
  if (redis) {
    const keys = await redis.keys(prefix + "*");
    if (keys.length === 0) return [];
    const values = await Promise.all(keys.map((k) => redis.get(k)));
    return values.filter((v): v is string => v !== null);
  }

  pruneMemory();
  const tokens: string[] = [];
  for (const [key, val] of memSessions) {
    if (key.startsWith(prefix) && val.expiresAt > Date.now()) {
      tokens.push(val.token);
    }
  }
  return tokens;
}

export async function invalidateAllSessions(
  userId: string,
  ttl: number = 86400,
): Promise<void> {
  const prefix = `session:${userId}:`;

  const redis = await getRedis();
  if (redis) {
    const keys = await redis.keys(prefix + "*");
    if (keys.length > 0) {
      const tokens = await Promise.all(keys.map((k) => redis.get(k)));
      await Promise.all(
        tokens
          .filter((t): t is string => t !== null)
          .map((t) => redis.set(blacklistKey(t), "1", { EX: ttl })),
      );
      await Promise.all(keys.map((k) => redis.del(k)));
    }
    return;
  }

  pruneMemory();
  for (const [key, val] of memSessions) {
    if (key.startsWith(prefix)) {
      memBlacklist.set(blacklistKey(val.token), Date.now() + ttl * 1000);
      memSessions.delete(key);
    }
  }
}

export async function getSessionCount(userId: string): Promise<number> {
  const prefix = `session:${userId}:`;

  const redis = await getRedis();
  if (redis) {
    const keys = await redis.keys(prefix + "*");
    return keys.length;
  }

  pruneMemory();
  let count = 0;
  for (const [key, val] of memSessions) {
    if (key.startsWith(prefix) && val.expiresAt > Date.now()) {
      count++;
    }
  }
  return count;
}

export function clearSessionStore(): void {
  memSessions.clear();
  memBlacklist.clear();
}

export function forceInMemoryMode(): void {
  redisChecked = true;
  redisAvailable = false;
  redisClient = null;
}
