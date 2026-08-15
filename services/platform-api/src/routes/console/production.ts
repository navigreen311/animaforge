import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { crudRouter } from '../../lib/crudRouter.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';

/** Production surfaces: jobs, takes, calendar, live sessions, audio, styles. */

const router = Router();

function unavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so this resource cannot be read or written.',
    503,
  );
}

/* ------------------------------------------------------------------ */
/*  Generation jobs                                                    */
/* ------------------------------------------------------------------ */

router.get(
  '/jobs',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const query = z
      .object({
        status: z.string().optional(),
        projectId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const where = {
      userId: req.user!.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [items, total] = await Promise.all([
      requirePrisma().generationJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      requirePrisma().generationJob.count({ where }),
    ]);
    apiResponse.success(res, { items, total });
  }),
);

router.delete(
  '/jobs/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const job = await requirePrisma().generationJob.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!job) return apiResponse.error(res, 'NOT_FOUND', 'No such job', 404);
    if (job.status === 'complete') {
      return apiResponse.error(res, 'CONFLICT', 'A completed job cannot be cancelled', 409);
    }

    const updated = await requirePrisma().generationJob.update({
      where: { id: job.id },
      data: { status: 'cancelled' },
    });
    apiResponse.success(res, updated);
  }),
);

router.post(
  '/jobs/:id/retry',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const job = await requirePrisma().generationJob.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!job) return apiResponse.error(res, 'NOT_FOUND', 'No such job', 404);
    if (job.status !== 'failed' && job.status !== 'cancelled') {
      return apiResponse.error(
        res,
        'CONFLICT',
        `Only a failed or cancelled job can be retried; this one is ${job.status}`,
        409,
      );
    }

    // A retry is a new row, so the original attempt stays in the history.
    const retry = await requirePrisma().generationJob.create({
      data: {
        shotId: job.shotId,
        projectId: job.projectId,
        userId: job.userId,
        jobType: job.jobType,
        modelId: job.modelId,
        inputParams: job.inputParams === null ? {} : job.inputParams,
        inputHash: job.inputHash,
        tier: job.tier,
        status: 'queued',
      },
    });
    apiResponse.success(res, retry, 201);
  }),
);

/* ------------------------------------------------------------------ */
/*  Shot takes                                                         */
/* ------------------------------------------------------------------ */

router.get(
  '/shots/:shotId/takes',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().shotTake.findMany({
      where: { shotId: String(req.params.shotId) },
      orderBy: { takeNumber: 'asc' },
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.post(
  '/shots/:shotId/takes',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        jobId: z.string().optional(),
        outputUrl: z.string().url().optional(),
        thumbUrl: z.string().url().optional(),
        durationMs: z.number().int().positive().optional(),
        metadata: z.record(z.unknown()).default({}),
      })
      .parse(req.body);

    const shotId = String(req.params.shotId);
    const highest = await requirePrisma().shotTake.findFirst({
      where: { shotId },
      orderBy: { takeNumber: 'desc' },
      select: { takeNumber: true },
    });

    const take = await requirePrisma().shotTake.create({
      data: {
        shotId,
        takeNumber: (highest?.takeNumber ?? 0) + 1,
        jobId: body.jobId ?? null,
        outputUrl: body.outputUrl ?? null,
        thumbUrl: body.thumbUrl ?? null,
        durationMs: body.durationMs ?? null,
        metadata: body.metadata as object,
      },
    });
    apiResponse.success(res, take, 201);
  }),
);

router.delete(
  '/shots/:shotId/takes/:takeId',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const take = await requirePrisma().shotTake.findFirst({
      where: { id: String(req.params.takeId), shotId: String(req.params.shotId) },
    });
    if (!take) return apiResponse.error(res, 'NOT_FOUND', 'No such take', 404);
    await requirePrisma().shotTake.delete({ where: { id: take.id } });
    apiResponse.success(res, { deleted: true, id: take.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Calendar                                                           */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/calendar/events',
    model: 'calendarEvent',
    ownerField: 'userId',
    searchFields: ['title', 'description'],
    orderBy: { startDate: 'asc' },
    createSchema: z.object({
      title: z.string().min(1).max(200),
      type: z.string().min(1),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      projectId: z.string().optional(),
      ownerId: z.string().optional(),
      description: z.string().optional(),
    }),
    updateSchema: z.object({
      title: z.string().min(1).max(200).optional(),
      type: z.string().min(1).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      status: z.string().optional(),
      description: z.string().nullable().optional(),
    }),
  }),
);

/** Task dependencies for the calendar's dependency view. */
router.get(
  '/calendar/dependencies',
  requireAuth,
  asyncHandler(async (_req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().taskDependency.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

/**
 * Burndown, computed from the caller's calendar events.
 *
 * Aggregated at query time rather than stored. That is correct at this volume
 * and will need a rollup table before it is not.
 */
router.get(
  '/calendar/burndown',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const events = await requirePrisma().calendarEvent.findMany({
      where: { userId: req.user!.id },
      orderBy: { endDate: 'asc' },
    });

    const total = events.length;
    let done = 0;
    const points = events.map((e) => {
      if (e.status === 'complete') done += 1;
      return { date: e.endDate.toISOString().slice(0, 10), remaining: total - done };
    });

    apiResponse.success(res, { total, completed: done, remaining: total - done, points });
  }),
);

/* ------------------------------------------------------------------ */
/*  Live sessions                                                      */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/live/sessions',
    model: 'liveSession',
    ownerField: 'userId',
    createSchema: z.object({
      projectId: z.string().optional(),
      mode: z.enum(['interactive', 'broadcast', 'rehearsal']).optional(),
      avatarId: z.string().optional(),
      destinations: z.array(z.string()).default([]),
    }),
    updateSchema: z.object({
      status: z.string().optional(),
      destinations: z.array(z.string()).optional(),
      viewerPeak: z.number().int().min(0).optional(),
      startedAt: z.coerce.date().optional(),
      endedAt: z.coerce.date().optional(),
    }),
  }),
);

router.get(
  '/live/branching',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const narrativeId = req.query.narrativeId ? String(req.query.narrativeId) : undefined;
    const items = await requirePrisma().branchingScene.findMany({
      where: narrativeId ? { narrativeId } : {},
      take: 200,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

/* ------------------------------------------------------------------ */
/*  Audio                                                              */
/* ------------------------------------------------------------------ */
// AudioTrack is scoped to a project, not a user, so the ownership filter is
// applied here rather than by the factory.

router.get(
  '/audio/tracks',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;

    // Only tracks on projects the caller owns.
    const projects = await requirePrisma().project.findMany({
      where: { ownerId: req.user!.id, ...(projectId ? { id: projectId } : {}) },
      select: { id: true },
    });
    const ids = projects.map((p) => p.id);
    if (ids.length === 0) return apiResponse.success(res, { items: [], total: 0 });

    const items = await requirePrisma().audioTrack.findMany({
      where: { projectId: { in: ids } },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.post(
  '/audio/tracks',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        projectId: z.string().uuid(),
        type: z.enum(['voice', 'sfx', 'music', 'mixed']),
        url: z.string().url(),
        duration: z.number().int().positive(),
        metadata: z.record(z.unknown()).default({}),
      })
      .parse(req.body);

    const owned = await requirePrisma().project.findFirst({
      where: { id: body.projectId, ownerId: req.user!.id },
    });
    if (!owned) return apiResponse.error(res, 'NOT_FOUND', 'No such project', 404);

    const track = await requirePrisma().audioTrack.create({
      data: { ...body, metadata: body.metadata as object },
    });
    apiResponse.success(res, track, 201);
  }),
);

router.patch(
  '/audio/tracks/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ url: z.string().url().optional(), metadata: z.record(z.unknown()).optional() })
      .parse(req.body);

    const track = await requirePrisma().audioTrack.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!track) return apiResponse.error(res, 'NOT_FOUND', 'No such track', 404);
    const owned = await requirePrisma().project.findFirst({
      where: { id: track.projectId, ownerId: req.user!.id },
    });
    if (!owned) return apiResponse.error(res, 'NOT_FOUND', 'No such track', 404);

    const updated = await requirePrisma().audioTrack.update({
      where: { id: track.id },
      data: { ...body, ...(body.metadata ? { metadata: body.metadata as object } : {}) },
    });
    apiResponse.success(res, updated);
  }),
);

router.delete(
  '/audio/tracks/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const track = await requirePrisma().audioTrack.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!track) return apiResponse.error(res, 'NOT_FOUND', 'No such track', 404);
    const owned = await requirePrisma().project.findFirst({
      where: { id: track.projectId, ownerId: req.user!.id },
    });
    if (!owned) return apiResponse.error(res, 'NOT_FOUND', 'No such track', 404);

    await requirePrisma().audioTrack.delete({ where: { id: track.id } });
    apiResponse.success(res, { deleted: true, id: track.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Style packs                                                        */
/* ------------------------------------------------------------------ */

router.get(
  '/styles',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const scope = req.query.scope === 'public' ? 'public' : 'mine';
    const where = scope === 'public' ? { isPublic: true } : { creatorId: req.user!.id };

    const items = await requirePrisma().stylePack.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.post(
  '/styles',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(120),
        sourceUrl: z.string().url(),
        sourceType: z.enum(['video', 'animation']),
        fingerprint: z.record(z.unknown()).default({}),
        isPublic: z.boolean().default(false),
        price: z.number().nonnegative().optional(),
      })
      .parse(req.body);

    const pack = await requirePrisma().stylePack.create({
      data: {
        ...body,
        creatorId: req.user!.id,
        fingerprint: body.fingerprint as object,
        price: body.price ?? null,
      },
    });
    apiResponse.success(res, pack, 201);
  }),
);

router.get(
  '/styles/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const pack = await requirePrisma().stylePack.findFirst({
      where: {
        id: String(req.params.id),
        OR: [{ creatorId: req.user!.id }, { isPublic: true }],
      },
    });
    if (!pack) return apiResponse.error(res, 'NOT_FOUND', 'No such style pack', 404);
    apiResponse.success(res, pack);
  }),
);

router.delete(
  '/styles/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const pack = await requirePrisma().stylePack.findFirst({
      where: { id: String(req.params.id), creatorId: req.user!.id },
    });
    if (!pack) return apiResponse.error(res, 'NOT_FOUND', 'No such style pack', 404);
    await requirePrisma().stylePack.delete({ where: { id: pack.id } });
    apiResponse.success(res, { deleted: true, id: pack.id });
  }),
);

export default router;
