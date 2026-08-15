import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { isDatabaseReachable, requirePrisma } from '../db.js';
import * as apiResponse from '../utils/apiResponse.js';

/**
 * A CRUD router over one Prisma model.
 *
 * Twenty-odd console resources are the same five endpoints over a different
 * table: list mine, create mine, read one, patch one, delete one. Writing those
 * a hundred times by hand is a hundred chances to forget the ownership filter,
 * which is the one that matters — every query here is scoped to the caller, so
 * "forgot to scope it" stops being a per-route decision.
 *
 * Resources that need more than CRUD get their own router and mount extra
 * routes; this only removes the repetition, it does not cap what a resource can
 * do.
 */

export interface CrudOptions<TCreate extends z.ZodTypeAny, TUpdate extends z.ZodTypeAny> {
  /** Path segment, e.g. `/avatars`. */
  path: string;
  /** Prisma model accessor name, e.g. `avatar` for `prisma.avatar`. */
  model: string;
  createSchema: TCreate;
  updateSchema: TUpdate;
  /**
   * Column holding the owning user id. Every read and write is filtered by it.
   * `null` marks a genuinely global catalogue (e.g. built-in voices), which
   * must be stated explicitly rather than reached by omission.
   */
  ownerField: string | null;
  /** Columns matched against `?q=`. */
  searchFields?: string[];
  /** Default ordering. */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** Relations to include on read. */
  include?: Record<string, boolean>;
  /** Shape a row before it goes out. */
  transform?: (row: Record<string, unknown>) => Record<string, unknown>;
}

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});

type PrismaDelegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

/** The caller, or null when the request carries no identity. */
function callerId(req: Request): string | null {
  return req.user?.id ?? null;
}

/**
 * Answer 503 rather than inventing data.
 *
 * These resources have no in-memory fallback on purpose. A fallback that
 * forgets on restart is the behaviour issue #58 exists to remove, so when the
 * database is down the honest answer is "unavailable", not an empty list that
 * looks like "you have nothing".
 */
function databaseUnavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so this resource cannot be read or written.',
    503,
  );
}

export function crudRouter<TCreate extends z.ZodTypeAny, TUpdate extends z.ZodTypeAny>(
  options: CrudOptions<TCreate, TUpdate>,
): Router {
  const router = Router();
  const {
    path,
    model,
    createSchema,
    updateSchema,
    ownerField,
    searchFields = [],
    orderBy = { createdAt: 'desc' },
    include,
    transform = (row) => row,
  } = options;

  const delegate = (): PrismaDelegate =>
    (requirePrisma() as unknown as Record<string, PrismaDelegate>)[model];

  /** Ownership filter, plus optional search. */
  const scope = (userId: string | null, q?: string): Record<string, unknown> => {
    const where: Record<string, unknown> = {};
    if (ownerField && userId) where[ownerField] = userId;
    if (q && searchFields.length > 0) {
      where.OR = searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
    return where;
  };

  router.get(
    path,
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!(await isDatabaseReachable())) return databaseUnavailable(res);
      const { page, limit, q } = listQuery.parse(req.query);
      const where = scope(callerId(req), q);

      const [rows, total] = await Promise.all([
        delegate().findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          ...(include ? { include } : {}),
        }),
        delegate().count({ where }),
      ]);

      apiResponse.success(res, { items: rows.map(transform), total, page, limit });
    }),
  );

  router.post(
    path,
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!(await isDatabaseReachable())) return databaseUnavailable(res);
      const parsed = createSchema.parse(req.body) as Record<string, unknown>;
      const userId = callerId(req);

      const row = await delegate().create({
        data: { ...parsed, ...(ownerField && userId ? { [ownerField]: userId } : {}) },
      });
      apiResponse.success(res, transform(row), 201);
    }),
  );

  router.get(
    `${path}/:id`,
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!(await isDatabaseReachable())) return databaseUnavailable(res);
      const row = await delegate().findFirst({
        where: { id: String(req.params.id), ...scope(callerId(req)) },
        ...(include ? { include } : {}),
      });
      if (!row) return apiResponse.error(res, 'NOT_FOUND', `No ${model} with that id`, 404);
      apiResponse.success(res, transform(row));
    }),
  );

  router.patch(
    `${path}/:id`,
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!(await isDatabaseReachable())) return databaseUnavailable(res);
      const parsed = updateSchema.parse(req.body) as Record<string, unknown>;
      // findFirst, not update-by-id: an update filtered only by id would let a
      // caller write another user's row.
      const existing = await delegate().findFirst({
        where: { id: String(req.params.id), ...scope(callerId(req)) },
      });
      if (!existing) return apiResponse.error(res, 'NOT_FOUND', `No ${model} with that id`, 404);

      const row = await delegate().update({ where: { id: existing.id }, data: parsed });
      apiResponse.success(res, transform(row));
    }),
  );

  router.delete(
    `${path}/:id`,
    requireAuth,
    asyncHandler(async (req, res) => {
      if (!(await isDatabaseReachable())) return databaseUnavailable(res);
      const existing = await delegate().findFirst({
        where: { id: String(req.params.id), ...scope(callerId(req)) },
      });
      if (!existing) return apiResponse.error(res, 'NOT_FOUND', `No ${model} with that id`, 404);

      await delegate().delete({ where: { id: existing.id } });
      apiResponse.success(res, { deleted: true, id: existing.id });
    }),
  );

  return router;
}
