import crypto from "crypto";
import prisma from "../db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random API key prefixed with `af_` for easy identification. */
function generateRawKey(): string {
  return `af_${crypto.randomBytes(32).toString("hex")}`;
}

/** Deterministic SHA-256 hash used for storage & lookup. */
function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Mask a key for display: show prefix + first 8 hex chars, then asterisks. */
function maskKey(keyHash: string): string {
  return `af_${keyHash.slice(0, 8)}${"*".repeat(24)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ApiKeyRecord {
  id: string;
  name: string;
  scopes: string[];
  maskedKey: string;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Create a new API key for a user.
 * Returns both the raw key (shown once) and the persisted record.
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = [],
): Promise<{ rawKey: string; record: ApiKeyRecord }> {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);

  const row = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      scopes,
    },
  });

  return {
    rawKey,
    record: {
      id: row.id,
      name: row.name,
      scopes: row.scopes,
      maskedKey: maskKey(keyHash),
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    },
  };
}

/**
 * Validate an incoming raw API key.
 * Hashes it and looks up the corresponding record.
 * Returns the API key row (with userId) or null.
 */
export async function validateApiKey(
  raw: string,
): Promise<{
  id: string;
  userId: string;
  name: string;
  scopes: string[];
} | null> {
  const keyHash = hashKey(raw);

  const row = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!row) return null;

  // Check expiration
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    scopes: row.scopes,
  };
}

/**
 * List all API keys belonging to a user (masked).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    maskedKey: maskKey(row.keyHash),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }));
}

/**
 * Revoke (delete) an API key by ID.
 * Returns true if deleted, false if not found.
 */
export async function revokeApiKey(
  id: string,
  userId: string,
): Promise<boolean> {
  try {
    await prisma.apiKey.deleteMany({
      where: { id, userId },
    });
    return true;
  } catch {
    return false;
  }
}
