import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';

/**
 * Activity, analytics, billing reads and piracy.
 *
 * Analytics are aggregated at query time over GenerationJob and UsageMeter.
 * That is correct at this data volume and will need a rollup table before it
 * is not; see docs/persistence.md section 7.
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
/*  Activity feed                                                      */
/* ------------------------------------------------------------------ */

router.get(
  '/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit);

    const items = await requirePrisma().auditTrail.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

/* ------------------------------------------------------------------ */
/*  Analytics                                                          */
/* ------------------------------------------------------------------ */

const periodSchema = z.enum(['day', 'week', 'month', 'all']).default('month');

function cutoffFor(period: z.infer<typeof periodSchema>): Date | undefined {
  const now = Date.now();
  switch (period) {
    case 'day':
      return new Date(now - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

router.get(
  '/analytics',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const period = periodSchema.parse(req.query.period ?? 'month');
    const cutoff = cutoffFor(period);
    const where = { userId: req.user!.id, ...(cutoff ? { createdAt: { gte: cutoff } } : {}) };

    const [jobs, projects, usage] = await Promise.all([
      requirePrisma().generationJob.findMany({
        where,
        select: {
          status: true,
          jobType: true,
          tier: true,
          createdAt: true,
          costCredits: true,
          errorReason: true,
          projectId: true,
          project: { select: { id: true, title: true } },
        },
      }),
      requirePrisma().project.count({ where: { ownerId: req.user!.id, deletedAt: null } }),
      requirePrisma().usageMeter.findMany({ where: { userId: req.user!.id } }),
    ]);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const j of jobs) {
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
      byType[j.jobType] = (byType[j.jobType] ?? 0) + 1;
    }

    // Credits by job type, tier mix and failure reasons all come off the jobs
    // already loaded. Each is a real sum over real rows -- the console used to
    // draw these breakdowns from literals, which is what issue #58 is about.
    const creditsByType: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const failureReasons: Record<string, number> = {};
    const perProject = new Map<
      string,
      { id: string; title: string; credits: number; renders: number; tiers: Record<string, number> }
    >();

    for (const j of jobs) {
      const credits = j.costCredits ?? 0;
      creditsByType[j.jobType] = (creditsByType[j.jobType] ?? 0) + credits;
      byTier[j.tier] = (byTier[j.tier] ?? 0) + 1;
      if (j.status === 'failed') {
        // A failed job with no recorded reason is counted as unknown rather
        // than assigned to a plausible one.
        const reason = j.errorReason ?? 'unknown';
        failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
      }
      const key = j.projectId;
      const entry = perProject.get(key) ?? {
        id: key,
        title: j.project?.title ?? key,
        credits: 0,
        renders: 0,
        tiers: {},
      };
      entry.credits += credits;
      entry.renders += 1;
      entry.tiers[j.tier] = (entry.tiers[j.tier] ?? 0) + 1;
      perProject.set(key, entry);
    }

    const topProjects = [...perProject.values()]
      .sort((a, b) => b.credits - a.credits || b.renders - a.renders)
      .slice(0, 10);

    apiResponse.success(res, {
      period,
      projects,
      generations: jobs.length,
      completed: byStatus.complete ?? 0,
      failed: byStatus.failed ?? 0,
      byStatus,
      byType,
      byTier,
      creditsByType,
      failureReasons,
      topProjects,
      creditsUsed: usage.reduce((sum, u) => sum + u.credits, 0),
    });
  }),
);

router.get(
  '/analytics/project/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const projectId = String(req.params.id);
    const project = await requirePrisma().project.findFirst({
      where: { id: projectId, ownerId: req.user!.id },
    });
    if (!project) return apiResponse.error(res, 'NOT_FOUND', 'No such project', 404);

    const [jobs, scenes, shots] = await Promise.all([
      requirePrisma().generationJob.findMany({
        where: { projectId },
        select: { status: true, jobType: true, createdAt: true },
      }),
      requirePrisma().scene.count({ where: { projectId } }),
      requirePrisma().shot.count({ where: { projectId } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const j of jobs) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;

    apiResponse.success(res, {
      projectId,
      title: project.title,
      scenes,
      shots,
      generations: jobs.length,
      byStatus,
    });
  }),
);

router.get(
  '/analytics/content-performance',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    // Ranked by generation volume: the only engagement signal this schema has.
    // Real view/watch metrics would need a publishing analytics source.
    const projects = await requirePrisma().project.findMany({
      where: { ownerId: req.user!.id, deletedAt: null },
      select: { id: true, title: true, _count: { select: { jobs: true, shots: true } } },
      take: 50,
    });

    apiResponse.success(res, {
      items: projects
        .map((p) => ({
          projectId: p.id,
          title: p.title,
          generations: p._count.jobs,
          shots: p._count.shots,
        }))
        .sort((a, b) => b.generations - a.generations),
      metric: 'generations',
      note: 'Ranked by generation volume; this schema records no view or watch-time data.',
    });
  }),
);

/* ------------------------------------------------------------------ */
/*  Billing reads                                                      */
/* ------------------------------------------------------------------ */

router.get(
  '/billing/subscription',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const subscription = await requirePrisma().subscription.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      return apiResponse.success(res, { subscription: null, tier: 'free' });
    }
    apiResponse.success(res, { subscription, tier: subscription.tier });
  }),
);

router.get(
  '/billing/invoices',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    // Receipts of payment actions are the only billing history this schema
    // holds; Stripe invoices live in Stripe.
    const items = await requirePrisma().receipt.findMany({
      where: { userId: req.user!.id, action: 'payment_processed' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

/* ------------------------------------------------------------------ */
/*  Piracy                                                             */
/* ------------------------------------------------------------------ */

router.get(
  '/piracy/matches',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const q = z
      .object({
        status: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(req.query);

    const where = { userId: req.user!.id, ...(q.status ? { status: q.status } : {}) };
    const [items, total] = await Promise.all([
      requirePrisma().piracyMatch.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        take: q.limit,
      }),
      requirePrisma().piracyMatch.count({ where }),
    ]);
    apiResponse.success(res, { items, total });
  }),
);

router.get(
  '/piracy/matches/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const match = await requirePrisma().piracyMatch.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!match) return apiResponse.error(res, 'NOT_FOUND', 'No such match', 404);

    const notices = await requirePrisma().dMCANotice.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse.success(res, { ...match, notices });
  }),
);

router.patch(
  '/piracy/matches/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ status: z.enum(['pending', 'reviewing', 'dismissed', 'dmca_sent']) })
      .parse(req.body);

    const match = await requirePrisma().piracyMatch.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!match) return apiResponse.error(res, 'NOT_FOUND', 'No such match', 404);

    const updated = await requirePrisma().piracyMatch.update({
      where: { id: match.id },
      data: { status: body.status, reviewedAt: new Date() },
    });
    apiResponse.success(res, updated);
  }),
);

router.post(
  '/piracy/dmca',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ matchId: z.string().min(1), body: z.string().optional() })
      .parse(req.body);

    const match = await requirePrisma().piracyMatch.findFirst({
      where: { id: body.matchId, userId: req.user!.id },
    });
    if (!match) return apiResponse.error(res, 'NOT_FOUND', 'No such match', 404);

    const notice = await requirePrisma().dMCANotice.create({
      data: {
        matchId: match.id,
        userId: req.user!.id,
        platform: match.platform,
        status: 'draft',
        body: body.body ?? null,
        metadata: { matchUrl: match.matchUrl },
      },
    });
    await requirePrisma().piracyMatch.update({
      where: { id: match.id },
      data: { status: 'dmca_sent', reviewedAt: new Date() },
    });
    apiResponse.success(res, notice, 201);
  }),
);

export default router;
