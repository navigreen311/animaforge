import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient | null = null;

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

export default prisma;
export { prisma };
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
