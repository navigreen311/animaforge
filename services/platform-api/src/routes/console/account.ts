import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { crudRouter } from '../../lib/crudRouter.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';
import type { Prisma } from '@prisma/client';

/**
 * The signed-in user's own account: profile, sessions, API keys, webhooks,
 * notifications.
 */

const router = Router();

function unavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so account data cannot be read or written.',
    503,
  );
}

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  stylePrefs: z.record(z.unknown()).optional(),
  genMemory: z.record(z.unknown()).optional(),
  cookieConsent: z.record(z.unknown()).optional(),
  onboardingComplete: z.boolean().optional(),
});

router.get(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const user = await requirePrisma().user.findUnique({ where: { id: req.user!.id } });
    if (!user) return apiResponse.error(res, 'NOT_FOUND', 'No such user', 404);
    apiResponse.success(res, user);
  }),
);

router.patch(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    // Json columns take Prisma's InputJsonValue, which a plain
    // Record<string, unknown> does not satisfy structurally.
    const data = updateMeSchema.parse(req.body) as Prisma.UserUpdateInput;
    const user = await requirePrisma().user.update({ where: { id: req.user!.id }, data });
    apiResponse.success(res, user);
  }),
);

router.delete(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    // Soft delete: the row is referenced by projects, characters and receipts,
    // and a hard delete would either cascade those away or fail on the FK.
    const user = await requirePrisma().user.update({
      where: { id: req.user!.id },
      data: { deletedAt: new Date() },
    });
    apiResponse.success(res, { deleted: true, id: user.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Generation memory                                                  */
/* ------------------------------------------------------------------ */

router.get(
  '/users/me/memory',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const user = await requirePrisma().user.findUnique({
      where: { id: req.user!.id },
      select: { genMemory: true },
    });
    apiResponse.success(res, user?.genMemory ?? {});
  }),
);

router.patch(
  '/users/me/memory',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const patch = z.record(z.unknown()).parse(req.body);
    const current = await requirePrisma().user.findUnique({
      where: { id: req.user!.id },
      select: { genMemory: true },
    });
    const merged = { ...((current?.genMemory as object) ?? {}), ...patch };
    const user = await requirePrisma().user.update({
      where: { id: req.user!.id },
      data: { genMemory: merged as Prisma.InputJsonValue },
      select: { genMemory: true },
    });
    apiResponse.success(res, user.genMemory);
  }),
);

router.delete(
  '/users/me/memory',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    await requirePrisma().user.update({
      where: { id: req.user!.id },
      data: { genMemory: {} },
    });
    apiResponse.success(res, { cleared: true });
  }),
);

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

router.get(
  '/users/me/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    apiResponse.success(res, {
      items,
      unread: items.filter((n) => !n.isRead).length,
    });
  }),
);

router.patch(
  '/users/me/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ ids: z.array(z.string()).optional(), isRead: z.boolean().default(true) })
      .parse(req.body);

    const result = await requirePrisma().notification.updateMany({
      where: {
        userId: req.user!.id,
        ...(body.ids && body.ids.length > 0 ? { id: { in: body.ids } } : {}),
      },
      data: { isRead: body.isRead },
    });
    apiResponse.success(res, { updated: result.count });
  }),
);

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/users/me/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().userSession.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      orderBy: { lastActiveAt: 'desc' },
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.delete(
  '/users/me/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const existing = await requirePrisma().userSession.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!existing) return apiResponse.error(res, 'NOT_FOUND', 'No such session', 404);

    // Revoked, not deleted: the row is the audit record of the session existing.
    await requirePrisma().userSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    apiResponse.success(res, { revoked: true, id: existing.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  API keys                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/api-keys',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().apiKey.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      // keyHash is deliberately not selected: it never leaves the server.
      select: { id: true, name: true, scopes: true, expiresAt: true, createdAt: true },
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.post(
  '/api-keys',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(120),
        scopes: z.array(z.string()).default([]),
        expiresAt: z.string().datetime().optional(),
      })
      .parse(req.body);

    // The plaintext key is shown once and never stored.
    const plaintext = `af_${crypto.randomBytes(24).toString('base64url')}`;
    const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex');

    const row = await requirePrisma().apiKey.create({
      data: {
        userId: req.user!.id,
        name: body.name,
        scopes: body.scopes,
        keyHash,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      select: { id: true, name: true, scopes: true, expiresAt: true, createdAt: true },
    });

    apiResponse.success(res, { ...row, key: plaintext }, 201);
  }),
);

router.delete(
  '/api-keys/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const existing = await requirePrisma().apiKey.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!existing) return apiResponse.error(res, 'NOT_FOUND', 'No such API key', 404);
    await requirePrisma().apiKey.delete({ where: { id: existing.id } });
    apiResponse.success(res, { deleted: true, id: existing.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Webhooks                                                           */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/webhook-endpoints',
    model: 'webhookEndpoint',
    ownerField: 'userId',
    searchFields: ['url'],
    createSchema: z.object({
      url: z.string().url(),
      events: z.array(z.string()).default([]),
      // Generated server-side so the signing secret is never client-chosen.
      secret: z.string().default(''),
      active: z.boolean().default(true),
    }),
    updateSchema: z.object({
      url: z.string().url().optional(),
      events: z.array(z.string()).optional(),
      active: z.boolean().optional(),
    }),
  }),
);

/** Deliveries recorded against one endpoint. */
router.get(
  '/webhook-endpoints/:id/deliveries',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const endpoint = await requirePrisma().webhookEndpoint.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!endpoint) return apiResponse.error(res, 'NOT_FOUND', 'No such webhook', 404);

    const items = await requirePrisma().webhookDelivery.findMany({
      where: { webhookId: endpoint.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

export default router;
