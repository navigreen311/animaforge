import { randomUUID } from 'crypto';

/**
 * Generate a UUID v4 identifier.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Returns a where filter that excludes soft-deleted records.
 */
export function excludeDeleted(): { deletedAt: null } {
  return { deletedAt: null };
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
 * Paginated query helper — wraps a Prisma `findMany`-style query with skip/take.
 *
 * @param model   - A Prisma delegate that supports `findMany` and `count`
 * @param where   - Prisma where filter
 * @param page    - 1-based page number
 * @param limit   - Number of records per page
 * @param orderBy - Prisma orderBy clause
 * @returns An object with `data` and `meta` containing pagination info
 */
export async function paginatedQuery<
  T extends {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    count: (args?: Record<string, unknown>) => Promise<number>;
  },
>(
  model: T,
  where: Record<string, unknown> = {},
  page: number = 1,
  limit: number = 20,
  orderBy: Record<string, unknown> = { createdAt: 'desc' },
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const skip = (safePage - 1) * safeLimit;

  const [data, total] = await Promise.all([
    model.findMany({ where, skip, take: safeLimit, orderBy }),
    model.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
