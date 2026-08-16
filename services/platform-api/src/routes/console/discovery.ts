import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';

/**
 * Surfaces the console reads but nothing owned: the public explore feed,
 * cross-entity search, shot reviews, publish jobs and branching narratives.
 */

const router = Router();

function unavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so this data cannot be read.',
    503,
  );
}

/* ------------------------------------------------------------------ */
/*  Explore — the public feed                                          */
/* ------------------------------------------------------------------ */
// GenerationJob already carries isPublic / publicCaption / publicLikes, so the
// feed is those rows rather than a separate table.

router.get(
  '/explore',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const q = z
      .object({
        sort: z.enum(['trending', 'new', 'liked']).default('trending'),
        limit: z.coerce.number().int().min(1).max(60).default(24),
      })
      .parse(req.query);

    const orderBy =
      q.sort === 'new'
        ? [{ createdAt: 'desc' as const }]
        : q.sort === 'liked'
          ? [{ publicLikes: 'desc' as const }]
          : // "Trending" is likes among recent posts. There is no engagement
            // velocity in this schema, so it is likes ordered within recency
            // rather than a score the data cannot support.
            [{ publicLikes: 'desc' as const }, { createdAt: 'desc' as const }];

    const rows = await requirePrisma().generationJob.findMany({
      where: { isPublic: true, status: 'complete', outputUrl: { not: null } },
      orderBy,
      take: q.limit,
      select: {
        id: true,
        outputUrl: true,
        publicCaption: true,
        publicLikes: true,
        createdAt: true,
        modelId: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    apiResponse.success(res, { items: rows, total: rows.length, sort: q.sort });
  }),
);

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const q = z
      .object({
        q: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      })
      .parse(req.query);

    const userId = req.user!.id;
    const like = { contains: q.q, mode: 'insensitive' as const };

    // Scoped to the caller's own content. A search that reaches other users'
    // rows is a data leak, not a feature.
    // Assets have no owner column; they hang off a project, so the caller's
    // projects are the scope.
    const ownedProjects = await requirePrisma().project.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    const ownedProjectIds = ownedProjects.map((p) => p.id);

    const [projects, characters, scripts, assets] = await Promise.all([
      requirePrisma().project.findMany({
        where: { ownerId: userId, deletedAt: null, title: like },
        select: { id: true, title: true, status: true, updatedAt: true },
        take: q.limit,
      }),
      requirePrisma().character.findMany({
        where: { ownerId: userId, name: like },
        select: { id: true, name: true, createdAt: true },
        take: q.limit,
      }),
      requirePrisma().script.findMany({
        where: { userId, OR: [{ title: like }, { content: like }] },
        select: { id: true, title: true, status: true, updatedAt: true },
        take: q.limit,
      }),
      ownedProjectIds.length === 0
        ? Promise.resolve([])
        : requirePrisma().asset.findMany({
            where: { projectId: { in: ownedProjectIds }, name: like },
            select: { id: true, name: true, type: true, projectId: true, createdAt: true },
            take: q.limit,
          }),
    ]);

    apiResponse.success(res, {
      query: q.q,
      projects,
      characters,
      scripts,
      assets,
      total: projects.length + characters.length + scripts.length + assets.length,
    });
  }),
);

/* ------------------------------------------------------------------ */
/*  Shot reviews                                                       */
/* ------------------------------------------------------------------ */

router.get(
  '/projects/:projectId/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const projectId = String(req.params.projectId);

    const owned = await requirePrisma().project.findFirst({
      where: { id: projectId, ownerId: req.user!.id },
    });
    if (!owned) return apiResponse.error(res, 'NOT_FOUND', 'No such project', 404);

    const items = await requirePrisma().shotReview.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // The review token is the credential in the share link; it does not go out.
    apiResponse.success(res, {
      items: items.map(({ token: _token, ...rest }) => rest),
      total: items.length,
    });
  }),
);

/* ------------------------------------------------------------------ */
/*  Publish jobs (exports)                                             */
/* ------------------------------------------------------------------ */

router.get(
  '/projects/:projectId/publish-jobs',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const projectId = String(req.params.projectId);

    const owned = await requirePrisma().project.findFirst({
      where: { id: projectId, ownerId: req.user!.id },
    });
    if (!owned) return apiResponse.error(res, 'NOT_FOUND', 'No such project', 404);

    const items = await requirePrisma().publishJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

/* ------------------------------------------------------------------ */
/*  Branching narratives                                               */
/* ------------------------------------------------------------------ */

router.get(
  '/live/narratives',
  requireAuth,
  asyncHandler(async (_req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    // A narrative is the set of scenes sharing a narrativeId; there is no
    // narrative table, so it is grouped rather than invented as one.
    const grouped = await requirePrisma().branchingScene.groupBy({
      by: ['narrativeId'],
      _count: { _all: true },
      _max: { updatedAt: true },
      orderBy: { _max: { updatedAt: 'desc' } },
      take: 100,
    });

    apiResponse.success(res, {
      items: grouped.map((g) => ({
        narrativeId: g.narrativeId,
        sceneCount: g._count._all,
        updatedAt: g._max.updatedAt,
      })),
      total: grouped.length,
    });
  }),
);

export default router;
