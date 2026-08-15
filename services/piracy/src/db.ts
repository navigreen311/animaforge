import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient | null = null;

// PrismaClient constructs happily without DATABASE_URL and only fails at query
// time, which would make every call log a validation error and fall back
// silently. Checking up front lets the service report "no database" honestly.
if (process.env.DATABASE_URL) {
  try {
    prisma =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma;
    }
  } catch {
    prisma = null;
  }
}

export default prisma;
export { prisma };
/**
 * Whether a PrismaClient object exists — NOT whether a database answers.
 * Use `isDatabaseReachable()` below for that decision.
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
 * `isPrismaAvailable()` above only reports whether a client object exists.
 * `new PrismaClient()` neither connects nor reads DATABASE_URL — both happen on
 * the first query — so it returns true against an unreachable host and an unset
 * DATABASE_URL alike. Guarding a database branch with it makes the in-memory
 * fallback underneath unreachable, and because nothing on the query path has a
 * timeout, a connection failure surfaces as a hung request instead.
 *
 * Runs `SELECT 1` once and caches the answer for the process. Concurrent
 * callers share one probe so a burst at startup does not open a connection
 * each. Tests can clear it with `resetDatabaseReachability()`.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
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
        '[piracy] database unreachable, using in-memory store:',
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
