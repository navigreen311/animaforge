import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';

/** Teams, memberships, invitations, presence and the workspace. */

const router = Router();

function unavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so team data cannot be read or written.',
    503,
  );
}

/** The organisation the caller belongs to, or null. */
async function callerOrgId(userId: string): Promise<string | null> {
  const user = await requirePrisma().user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId ?? null;
}

/* ------------------------------------------------------------------ */
/*  Teams                                                              */
/* ------------------------------------------------------------------ */

router.get(
  '/teams',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);
    if (!orgId) return apiResponse.success(res, { items: [], total: 0 });

    const items = await requirePrisma().team.findMany({
      where: { orgId },
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse.success(res, {
      items: items.map((t) => ({ ...t, memberCount: t.members.length })),
      total: items.length,
    });
  }),
);

router.post(
  '/teams',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(120),
        memberIds: z.array(z.string().uuid()).default([]),
      })
      .parse(req.body);

    const orgId = await callerOrgId(req.user!.id);
    if (!orgId) {
      // A team belongs to an organisation; without one there is nothing to
      // attach it to, and inventing an org would hide the real problem.
      return apiResponse.error(
        res,
        'NO_ORGANISATION',
        'You must belong to an organisation before creating a team.',
        409,
      );
    }

    const team = await requirePrisma().team.create({
      data: {
        orgId,
        name: body.name,
        members: {
          create: body.memberIds.map((userId) => ({ userId, role: 'member' })),
        },
      },
      include: { members: true },
    });
    apiResponse.success(res, { ...team, memberCount: team.members.length }, 201);
  }),
);

router.patch(
  '/teams/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z.object({ name: z.string().min(1).max(120) }).parse(req.body);
    const orgId = await callerOrgId(req.user!.id);

    const team = await requirePrisma().team.findFirst({
      where: { id: String(req.params.id), ...(orgId ? { orgId } : {}) },
    });
    if (!team) return apiResponse.error(res, 'NOT_FOUND', 'No such team', 404);

    const updated = await requirePrisma().team.update({
      where: { id: team.id },
      data: { name: body.name },
      include: { members: true },
    });
    apiResponse.success(res, { ...updated, memberCount: updated.members.length });
  }),
);

router.delete(
  '/teams/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);
    const team = await requirePrisma().team.findFirst({
      where: { id: String(req.params.id), ...(orgId ? { orgId } : {}) },
    });
    if (!team) return apiResponse.error(res, 'NOT_FOUND', 'No such team', 404);

    // Memberships reference the team, so they go first.
    await requirePrisma().membership.deleteMany({ where: { teamId: team.id } });
    await requirePrisma().team.delete({ where: { id: team.id } });
    apiResponse.success(res, { deleted: true, id: team.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Members                                                            */
/* ------------------------------------------------------------------ */

router.get(
  '/team/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);
    if (!orgId) return apiResponse.success(res, { items: [], total: 0 });

    const items = await requirePrisma().membership.findMany({
      where: { team: { orgId } },
      include: { team: true },
    });

    const userIds = [...new Set(items.map((m) => m.userId))];
    const users = await requirePrisma().user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, displayName: true, avatarUrl: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    apiResponse.success(res, {
      items: items.map((m) => ({
        id: m.id,
        userId: m.userId,
        teamId: m.teamId,
        teamName: m.team.name,
        role: m.role,
        user: byId.get(m.userId) ?? null,
      })),
      total: items.length,
    });
  }),
);

router.patch(
  '/team/members/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z.object({ role: z.string().min(1) }).parse(req.body);
    const orgId = await callerOrgId(req.user!.id);

    const membership = await requirePrisma().membership.findFirst({
      where: { id: String(req.params.id), ...(orgId ? { team: { orgId } } : {}) },
    });
    if (!membership) return apiResponse.error(res, 'NOT_FOUND', 'No such member', 404);

    const updated = await requirePrisma().membership.update({
      where: { id: membership.id },
      data: { role: body.role },
    });
    apiResponse.success(res, updated);
  }),
);

router.delete(
  '/team/members/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);
    const membership = await requirePrisma().membership.findFirst({
      where: { id: String(req.params.id), ...(orgId ? { team: { orgId } } : {}) },
    });
    if (!membership) return apiResponse.error(res, 'NOT_FOUND', 'No such member', 404);

    await requirePrisma().membership.delete({ where: { id: membership.id } });
    apiResponse.success(res, { deleted: true, id: membership.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Invitations                                                        */
/* ------------------------------------------------------------------ */

const INVITE_TTL_DAYS = 14;

router.get(
  '/team/invitations',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);

    const items = await requirePrisma().teamInvitation.findMany({
      where: { status: 'pending', ...(orgId ? { orgId } : { invitedBy: req.user!.id }) },
      orderBy: { createdAt: 'desc' },
    });
    // The token is the credential in the invite link; it does not go out here.
    apiResponse.success(res, {
      items: items.map(({ token: _token, ...rest }) => rest),
      total: items.length,
    });
  }),
);

router.post(
  '/team/invitations',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        email: z.string().email(),
        role: z.string().default('member'),
        teamId: z.string().uuid().optional(),
      })
      .parse(req.body);

    const orgId = await callerOrgId(req.user!.id);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await requirePrisma().teamInvitation.create({
      data: {
        email: body.email,
        role: body.role,
        teamId: body.teamId ?? null,
        orgId,
        invitedBy: req.user!.id,
        token: crypto.randomBytes(24).toString('base64url'),
        expiresAt,
      },
    });

    const { token: _token, ...safe } = invitation;
    apiResponse.success(res, safe, 201);
  }),
);

router.post(
  '/team/invitations/:id/resend',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const invitation = await requirePrisma().teamInvitation.findFirst({
      where: { id: String(req.params.id), status: 'pending' },
    });
    if (!invitation) return apiResponse.error(res, 'NOT_FOUND', 'No such invitation', 404);

    // Resending extends the window and re-rolls the token, so a link shared by
    // mistake stops working.
    const updated = await requirePrisma().teamInvitation.update({
      where: { id: invitation.id },
      data: {
        resentAt: new Date(),
        token: crypto.randomBytes(24).toString('base64url'),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const { token: _token, ...safe } = updated;
    apiResponse.success(res, safe);
  }),
);

router.delete(
  '/team/invitations/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const invitation = await requirePrisma().teamInvitation.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!invitation) return apiResponse.error(res, 'NOT_FOUND', 'No such invitation', 404);

    // Revoked, not deleted: who invited whom stays on the record.
    const updated = await requirePrisma().teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'revoked' },
    });
    apiResponse.success(res, { revoked: true, id: updated.id });
  }),
);

/* ------------------------------------------------------------------ */
/*  Presence                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/team/presence',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);

    const items = await requirePrisma().userPresence.findMany({
      where: orgId ? { orgId } : { userId: req.user!.id },
      orderBy: { lastSeen: 'desc' },
    });
    apiResponse.success(res, { items, total: items.length });
  }),
);

router.post(
  '/team/presence/heartbeat',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ currentPage: z.string().optional(), status: z.string().default('online') })
      .parse(req.body);

    const orgId = await callerOrgId(req.user!.id);
    const presence = await requirePrisma().userPresence.upsert({
      where: { userId: req.user!.id },
      update: { currentPage: body.currentPage ?? null, status: body.status, lastSeen: new Date() },
      create: {
        userId: req.user!.id,
        orgId,
        currentPage: body.currentPage ?? null,
        status: body.status,
      },
    });
    apiResponse.success(res, presence);
  }),
);

/* ------------------------------------------------------------------ */
/*  Workspace                                                          */
/* ------------------------------------------------------------------ */

router.get(
  '/workspace',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const orgId = await callerOrgId(req.user!.id);
    if (!orgId) return apiResponse.error(res, 'NOT_FOUND', 'You have no workspace', 404);

    const org = await requirePrisma().organization.findUnique({ where: { id: orgId } });
    apiResponse.success(res, org);
  }),
);

router.patch(
  '/workspace',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(120).optional(),
        settings: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const orgId = await callerOrgId(req.user!.id);
    if (!orgId) return apiResponse.error(res, 'NOT_FOUND', 'You have no workspace', 404);

    const org = await requirePrisma().organization.update({
      where: { id: orgId },
      data: { ...body, ...(body.settings ? { settings: body.settings as object } : {}) },
    });
    apiResponse.success(res, org);
  }),
);

export default router;
