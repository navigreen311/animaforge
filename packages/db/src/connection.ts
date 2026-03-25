import { prisma } from './index';

/**
 * Check database connection health by executing a simple query.
 * Returns true if the connection is healthy, false otherwise.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from the database.
 */
export async function gracefulDisconnect(): Promise<void> {
  await prisma.$disconnect();
}
