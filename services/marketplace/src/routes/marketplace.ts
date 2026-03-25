import { Router, Request, Response } from "express";
import {
  ListItemSchema,
  SearchSchema,
  PurchaseSchema,
  ReviewSchema,
  PayoutRequestSchema,
  listItem,
  getItem,
  searchItems,
  purchaseItem,
  getCreatorEarnings,
  getCreatorListings,
  requestPayout,
  submitReview,
  getReviews,
} from "../services/marketplaceService";

const router = Router();

// ── Items ────────────────────────────────────────────────────────────

/** POST /marketplace/items — list an item for sale */
router.post("/items", (req: Request, res: Response) => {
  const parsed = ListItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const item = listItem(parsed.data);
  return res.status(201).json(item);
});

/** GET /marketplace/items — browse with filters */
router.get("/items", (req: Request, res: Response) => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const results = searchItems(parsed.data);
  return res.json(results);
});

/** GET /marketplace/items/:id — item detail */
router.get("/items/:id", (req: Request, res: Response) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  return res.json(item);
});

/** POST /marketplace/items/:id/purchase — purchase an item */
router.post("/items/:id/purchase", (req: Request, res: Response) => {
  const parsed = PurchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = purchaseItem(req.params.id, parsed.data.buyerId);
  if ("error" in result) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

/** GET /marketplace/items/:id/reviews — get item reviews */
router.get("/items/:id/reviews", (req: Request, res: Response) => {
  const itemReviews = getReviews(req.params.id);
  return res.json({ reviews: itemReviews });
});

/** POST /marketplace/items/:id/reviews — submit a review */
router.post("/items/:id/reviews", (req: Request, res: Response) => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = submitReview(req.params.id, parsed.data);
  if ("error" in result) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

// ── Creators ─────────────────────────────────────────────────────────

/** GET /marketplace/creators/:id — creator profile + listings */
router.get("/creators/:id", (req: Request, res: Response) => {
  const listings = getCreatorListings(req.params.id);
  return res.json({ creatorId: req.params.id, listings, listingCount: listings.length });
});

/** GET /marketplace/creators/:id/earnings — earnings dashboard */
router.get("/creators/:id/earnings", (req: Request, res: Response) => {
  const earnings = getCreatorEarnings(req.params.id);
  return res.json(earnings);
});

// ── Payouts ──────────────────────────────────────────────────────────

/** POST /marketplace/payouts/request — creator requests payout (70/30 split) */
router.post("/payouts/request", (req: Request, res: Response) => {
  const parsed = PayoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = requestPayout(parsed.data.creatorId, parsed.data.amount);
  if ("error" in result) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

export default router;
