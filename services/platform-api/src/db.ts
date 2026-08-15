import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient | null = null;

try {
  prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch {
  prisma = null;
}

export default prisma;
export { prisma };

/**
 * Whether a PrismaClient object exists.
 *
 * This says nothing about whether a database is reachable. `new PrismaClient()`
 * does not connect and does not read DATABASE_URL — both happen on the first
 * query — so this returns true against an unreachable host, an unset
 * DATABASE_URL, and an empty schema alike.
 *
 * Guarding a database branch with this (or with a bare `if (prisma)`) commits
 * to Postgres whenever the client merely constructed, which is why every
 * in-memory fallback in this service used to be unreachable in local
 * development. Use `isDatabaseReachable()` for that decision.
 */
export function isPrismaAvailable(): boolean {
  return prisma !== null;
}

/**
 * The client, or a thrown error explaining why there isn't one.
 */
export function requirePrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      'Database unavailable: PrismaClient could not be constructed. Check ' +
        'DATABASE_URL and that `prisma generate` has run.',
    );
  }
  return prisma;
}

/* -------------------------------------------------------------------------- */
/*  Reachability                                                              */
/* -------------------------------------------------------------------------- */

let reachable: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

/**
 * Whether the database actually answers.
 *
 * Runs `SELECT 1` once and caches the answer, matching the probe already used
 * by services/workers, services/auth and services/talent. Callers that can
 * degrade should await this before taking a Prisma branch; without it a
 * connection failure surfaces as a hung request rather than a fallback, because
 * nothing on the query path has a timeout.
 *
 * The result is cached for the process lifetime: a probe per request would add
 * a round trip to every call, and a database that disappears mid-process is a
 * restart, not a branch condition. Tests can clear it with
 * `resetDatabaseReachability()`.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
  // Share one probe across concurrent callers so a burst at startup does not
  // open a connection each.
  if (inFlight) return inFlight;

  if (!prisma) {
    reachable = false;
    return reachable;
  }

  inFlight = (async () => {
    try {
      await prisma!.$queryRaw`SELECT 1`;
      reachable = true;
    } catch (err) {
      console.warn(
        '[platform-api] database unreachable, using in-memory store:',
        err instanceof Error ? err.message.split('\n')[0] : err,
      );
      reachable = false;
    }
    return reachable;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Clear the cached probe result. For tests. */
export function resetDatabaseReachability(): void {
  reachable = null;
  inFlight = null;
}
