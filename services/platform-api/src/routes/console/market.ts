import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import * as apiResponse from '../../utils/apiResponse.js';

/** Marketplace: listings, purchases, reviews, wishlist, earnings. */

const router = Router();

/** Platform commission, in basis points of the sale price. */
const PLATFORM_FEE_BPS = 3000; // 30%

function unavailable(res: Response): void {
  apiResponse.error(
    res,
    'DATABASE_UNAVAILABLE',
    'The database is not reachable, so marketplace data cannot be read or written.',
    503,
  );
}

function cents(price: unknown): number {
  return Math.round(Number(price) * 100);
}

/* ------------------------------------------------------------------ */
/*  Listings                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/marketplace/items',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const q = z
      .object({
        category: z.string().optional(),
        featured: z.coerce.boolean().optional(),
        q: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(24),
      })
      .parse(req.query);

    const where = {
      status: 'active',
      ...(q.category ? { category: q.category } : {}),
      ...(q.featured !== undefined ? { featured: q.featured } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      requirePrisma().marketplaceItem.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      requirePrisma().marketplaceItem.count({ where }),
    ]);
    apiResponse.success(res, { items, total, page: q.page, limit: q.limit });
  }),
);

router.post(
  '/marketplace/items',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(200),
        type: z.string().min(1),
        price: z.number().nonnegative(),
        description: z.string().default(''),
        previewUrl: z.string().url(),
        category: z.string().min(1),
      })
      .parse(req.body);

    const item = await requirePrisma().marketplaceItem.create({
      data: { ...body, creatorId: req.user!.id },
    });
    apiResponse.success(res, item, 201);
  }),
);

router.get(
  '/marketplace/items/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const item = await requirePrisma().marketplaceItem.findUnique({
      where: { id: String(req.params.id) },
      include: { reviews: true },
    });
    if (!item) return apiResponse.error(res, 'NOT_FOUND', 'No such item', 404);

    const ratings = item.reviews.map((r) => r.rating);
    apiResponse.success(res, {
      ...item,
      averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviewCount: ratings.length,
    });
  }),
);

router.patch(
  '/marketplace/items/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({
        name: z.string().min(1).max(200).optional(),
        price: z.number().nonnegative().optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'sold', 'removed']).optional(),
      })
      .parse(req.body);

    const item = await requirePrisma().marketplaceItem.findFirst({
      where: { id: String(req.params.id), creatorId: req.user!.id },
    });
    if (!item) return apiResponse.error(res, 'NOT_FOUND', 'No such item', 404);

    const updated = await requirePrisma().marketplaceItem.update({
      where: { id: item.id },
      data: body,
    });
    apiResponse.success(res, updated);
  }),
);

router.delete(
  '/marketplace/items/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const item = await requirePrisma().marketplaceItem.findFirst({
      where: { id: String(req.params.id), creatorId: req.user!.id },
    });
    if (!item) return apiResponse.error(res, 'NOT_FOUND', 'No such item', 404);

    // Withdrawn, not deleted: purchases and reviews reference it.
    const updated = await requirePrisma().marketplaceItem.update({
      where: { id: item.id },
      data: { status: 'removed' },
    });
    apiResponse.success(res, { removed: true, id: updated.id });
  }),
);

router.get(
  '/marketplace/published',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const items = await requirePrisma().marketplaceItem.findMany({
      where: { creatorId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        // Net of the platform fee: what the seller actually earned on this
        // listing, rather than gross price times purchase count.
        purchases: { select: { priceCents: true, feeCents: true, status: true } },
      },
    });

    apiResponse.success(res, {
      items: items.map(({ purchases, ...item }) => ({
        ...item,
        revenueCents: purchases
          .filter((p) => p.status === 'complete')
          .reduce((sum, p) => sum + (p.priceCents - p.feeCents), 0),
        salesCount: purchases.filter((p) => p.status === 'complete').length,
      })),
      total: items.length,
    });
  }),
);

/* ------------------------------------------------------------------ */
/*  Purchases and library                                              */
/* ------------------------------------------------------------------ */

router.post(
  '/marketplace/purchase',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z.object({ itemId: z.string().min(1) }).parse(req.body);

    const item = await requirePrisma().marketplaceItem.findUnique({ where: { id: body.itemId } });
    if (!item || item.status !== 'active') {
      return apiResponse.error(res, 'NOT_FOUND', 'No such item for sale', 404);
    }
    if (item.creatorId === req.user!.id) {
      return apiResponse.error(res, 'CONFLICT', 'You cannot buy your own item', 409);
    }

    const already = await requirePrisma().marketplacePurchase.findFirst({
      where: { itemId: item.id, buyerId: req.user!.id },
    });
    if (already) {
      return apiResponse.error(res, 'CONFLICT', 'You already own this item', 409);
    }

    const price = cents(item.price);
    const purchase = await requirePrisma().marketplacePurchase.create({
      data: {
        itemId: item.id,
        buyerId: req.user!.id,
        sellerId: item.creatorId,
        priceCents: price,
        feeCents: Math.round((price * PLATFORM_FEE_BPS) / 10_000),
      },
    });
    await requirePrisma().marketplaceItem.update({
      where: { id: item.id },
      data: { purchaseCount: { increment: 1 } },
    });

    apiResponse.success(res, purchase, 201);
  }),
);

router.get(
  '/marketplace/library',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const purchases = await requirePrisma().marketplacePurchase.findMany({
      where: { buyerId: req.user!.id, status: 'complete' },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse.success(res, {
      items: purchases.map((p) => ({ ...p.item, purchasedAt: p.createdAt })),
      total: purchases.length,
    });
  }),
);

router.get(
  '/marketplace/earnings',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const sales = await requirePrisma().marketplacePurchase.findMany({
      where: { sellerId: req.user!.id, status: 'complete' },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    const grossCents = sales.reduce((sum, s) => sum + s.priceCents, 0);
    const feeCents = sales.reduce((sum, s) => sum + s.feeCents, 0);
    apiResponse.success(res, {
      sales: sales.length,
      grossCents,
      feeCents,
      netCents: grossCents - feeCents,
      recent: sales.slice(0, 20),
    });
  }),
);

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */

router.post(
  '/marketplace/items/:id/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const body = z
      .object({ rating: z.number().int().min(1).max(5), body: z.string().default('') })
      .parse(req.body);

    const itemId = String(req.params.id);
    // Only buyers may review: otherwise the rating is worth nothing.
    const owns = await requirePrisma().marketplacePurchase.findFirst({
      where: { itemId, buyerId: req.user!.id },
    });
    if (!owns) {
      return apiResponse.error(res, 'FORBIDDEN', 'Only a buyer can review this item', 403);
    }

    const review = await requirePrisma().marketplaceReview.upsert({
      where: { itemId_authorId: { itemId, authorId: req.user!.id } },
      update: { rating: body.rating, body: body.body },
      create: { itemId, authorId: req.user!.id, rating: body.rating, body: body.body },
    });
    apiResponse.success(res, review, 201);
  }),
);

/* ------------------------------------------------------------------ */
/*  Wishlist                                                           */
/* ------------------------------------------------------------------ */

router.get(
  '/marketplace/wishlist',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const rows = await requirePrisma().wishlistItem.findMany({
      where: { userId: req.user!.id },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    apiResponse.success(res, { items: rows.map((r) => r.item), total: rows.length });
  }),
);

router.post(
  '/marketplace/wishlist/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const itemId = String(req.params.id);
    const item = await requirePrisma().marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return apiResponse.error(res, 'NOT_FOUND', 'No such item', 404);

    const row = await requirePrisma().wishlistItem.upsert({
      where: { itemId_userId: { itemId, userId: req.user!.id } },
      update: {},
      create: { itemId, userId: req.user!.id },
    });
    apiResponse.success(res, row, 201);
  }),
);

router.delete(
  '/marketplace/wishlist/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const row = await requirePrisma().wishlistItem.findFirst({
      where: { itemId: String(req.params.id), userId: req.user!.id },
    });
    if (!row) return apiResponse.error(res, 'NOT_FOUND', 'Not on your wishlist', 404);
    await requirePrisma().wishlistItem.delete({ where: { id: row.id } });
    apiResponse.success(res, { removed: true, itemId: row.itemId });
  }),
);

/* ------------------------------------------------------------------ */
/*  Creator profile                                                    */
/* ------------------------------------------------------------------ */

router.get(
  '/marketplace/creator/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await isDatabaseReachable())) return unavailable(res);
    const creatorId = String(req.params.id);
    const [creator, items, sales] = await Promise.all([
      requirePrisma().user.findUnique({
        where: { id: creatorId },
        select: { id: true, displayName: true, avatarUrl: true, createdAt: true },
      }),
      requirePrisma().marketplaceItem.findMany({
        where: { creatorId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
      requirePrisma().marketplacePurchase.count({ where: { sellerId: creatorId } }),
    ]);
    if (!creator) return apiResponse.error(res, 'NOT_FOUND', 'No such creator', 404);

    apiResponse.success(res, { creator, items, totalSales: sales });
  }),
);

export default router;
