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
export function isPrismaAvailable(): boolean {
  return prisma !== null;
}
