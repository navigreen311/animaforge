import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Generate a UUID v4 identifier.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Soft-delete a record by setting its `deletedAt` timestamp.
 *
 * @param model  - A Prisma delegate that supports `update` (e.g. `prisma.user`)
 * @param id     - The UUID of the record to soft-delete
 * @returns The updated record
 */
export async function softDelete<
  T extends { update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<unknown> },
>(model: T, id: string) {
  return model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Pagination helper — wraps a Prisma `findMany`-style query with skip/take.
 *
 * @param model  - A Prisma delegate that supports `findMany` and `count`
 * @param page   - 1-based page number
 * @param limit  - Number of records per page
 * @param args   - Additional findMany arguments (where, orderBy, include, etc.)
 * @returns An object with `data`, `page`, `limit`, `totalCount`, and `totalPages`
 */
export async function paginate<
  T extends {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    count: (args?: Record<string, unknown>) => Promise<number>;
  },
>(
  model: T,
  page: number = 1,
  limit: number = 20,
  args: Record<string, unknown> = {},
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const skip = (safePage - 1) * safeLimit;

  const [data, totalCount] = await Promise.all([
    model.findMany({ ...args, skip, take: safeLimit }),
    model.count(args.where ? { where: args.where } : undefined),
  ]);

  return {
    data,
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.ceil(totalCount / safeLimit),
  };
}
