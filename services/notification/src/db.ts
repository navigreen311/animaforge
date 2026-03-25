/**
 * Prisma client singleton — provides a single shared PrismaClient instance.
 *
 * In development the client is cached on `globalThis` to survive hot-reloads.
 * Falls back gracefully if @prisma/client is not installed (notification service
 * can run fully in-memory without a database).
 */

let prisma: any = null;

function createPrismaClient(): any {
  try {
    // Dynamic require so the module is optional
    const { PrismaClient } = require("@prisma/client");
    return new PrismaClient();
  } catch {
    // @prisma/client not available — return null to signal in-memory mode
    return null;
  }
}

const globalForPrisma = globalThis as unknown as { __prismaNotification?: any };

if (globalForPrisma.__prismaNotification) {
  prisma = globalForPrisma.__prismaNotification;
} else {
  prisma = createPrismaClient();
  if (process.env.NODE_ENV !== "production" && prisma) {
    globalForPrisma.__prismaNotification = prisma;
  }
}

export default prisma;
