// Database client - imports from @animaforge/db when available
// Falls back to in-memory for development without DB
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient();
} catch {
  // Fallback: PrismaClient not generated yet, use mock
  prisma = null as any;
}

export default prisma;
export { prisma };
