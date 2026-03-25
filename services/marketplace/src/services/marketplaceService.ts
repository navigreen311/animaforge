import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────

export const ListItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["model", "animation", "texture", "rig", "scene", "plugin", "template"]),
  price: z.number().min(0),
  description: z.string().min(1),
  previewUrl: z.string().url(),
  creatorId: z.string().uuid(),
});

export const SearchSchema = z.object({
  type: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "rating"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PurchaseSchema = z.object({
  buyerId: z.string().uuid(),
});

export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  userId: z.string().uuid(),
});

export const PayoutRequestSchema = z.object({
  creatorId: z.string().uuid(),
  amount: z.number().positive(),
});

// ── Types ────────────────────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  previewUrl: string;
  creatorId: string;
  status: "active" | "sold" | "removed";
  createdAt: string;
  purchaseCount: number;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commission: number;
  sellerEarning: number;
  createdAt: string;
}

export interface CreatorBalance {
  total: number;
  pending: number;
  paid: number;
  transactions: Transaction[];
}

export interface PayoutRequest {
  id: string;
  creatorId: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: string;
}

// ── Constants ────────────────────────────────────────────────────────

export const COMMISSION_RATE = 0.30; // AnimaForge takes 30%

// ── In-Memory Stores ─────────────────────────────────────────────────

const items: Map<string, MarketplaceItem> = new Map();
const reviews: Map<string, Review[]> = new Map();       // itemId -> Review[]
const transactions: Transaction[] = [];
const creatorBalances: Map<string, CreatorBalance> = new Map();
const payoutRequests: PayoutRequest[] = [];

// ── Helpers ──────────────────────────────────────────────────────────

function getOrCreateBalance(creatorId: string): CreatorBalance {
  if (!creatorBalances.has(creatorId)) {
    creatorBalances.set(creatorId, { total: 0, pending: 0, paid: 0, transactions: [] });
  }
  return creatorBalances.get(creatorId)!;
}

// ── Service ──────────────────────────────────────────────────────────

export function listItem(data: z.infer<typeof ListItemSchema>): MarketplaceItem {
  const item: MarketplaceItem = {
    id: uuidv4(),
    ...data,
    status: "active",
    createdAt: new Date().toISOString(),
    purchaseCount: 0,
  };
  items.set(item.id, item);
  reviews.set(item.id, []);
  return item;
}

export function getItem(id: string): MarketplaceItem | undefined {
  return items.get(id);
}

export function searchItems(query: z.infer<typeof SearchSchema>): {
  items: MarketplaceItem[];
  total: number;
  page: number;
  limit: number;
} {
  let results = Array.from(items.values()).filter((i) => i.status === "active");

  if (query.type) {
    results = results.filter((i) => i.type === query.type);
  }
  if (query.minPrice !== undefined) {
    results = results.filter((i) => i.price >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    results = results.filter((i) => i.price <= query.maxPrice!);
  }

  switch (query.sort) {
    case "price_asc":
      results.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      results.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "rating":
      results.sort((a, b) => getAverageRating(b.id) - getAverageRating(a.id));
      break;
    default:
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = results.length;
  const start = (query.page - 1) * query.limit;
  const paged = results.slice(start, start + query.limit);

  return { items: paged, total, page: query.page, limit: query.limit };
}

export function purchaseItem(
  itemId: string,
  buyerId: string
): { transaction: Transaction; item: MarketplaceItem } | { error: string } {
  const item = items.get(itemId);
  if (!item) return { error: "Item not found" };
  if (item.status !== "active") return { error: "Item is not available for purchase" };
  if (item.creatorId === buyerId) return { error: "Cannot purchase your own item" };

  const commission = +(item.price * COMMISSION_RATE).toFixed(2);
  const sellerEarning = +(item.price - commission).toFixed(2);

  const tx: Transaction = {
    id: uuidv4(),
    itemId,
    buyerId,
    sellerId: item.creatorId,
    amount: item.price,
    commission,
    sellerEarning,
    createdAt: new Date().toISOString(),
  };

  transactions.push(tx);
  item.purchaseCount += 1;

  // Credit creator balance
  const balance = getOrCreateBalance(item.creatorId);
  balance.total += sellerEarning;
  balance.pending += sellerEarning;
  balance.transactions.push(tx);

  return { transaction: tx, item };
}

export function getCreatorEarnings(creatorId: string): CreatorBalance {
  return getOrCreateBalance(creatorId);
}

export function getCreatorListings(creatorId: string): MarketplaceItem[] {
  return Array.from(items.values()).filter((i) => i.creatorId === creatorId);
}

export function requestPayout(
  creatorId: string,
  amount: number
): PayoutRequest | { error: string } {
  const balance = getOrCreateBalance(creatorId);
  if (amount > balance.pending) {
    return { error: "Insufficient pending balance" };
  }

  const payout: PayoutRequest = {
    id: uuidv4(),
    creatorId,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  balance.pending -= amount;
  balance.paid += amount;
  payoutRequests.push(payout);

  return payout;
}

export function submitReview(
  itemId: string,
  data: { rating: number; comment: string; userId: string }
): Review | { error: string } {
  if (!items.has(itemId)) return { error: "Item not found" };

  const itemReviews = reviews.get(itemId) ?? [];
  const alreadyReviewed = itemReviews.some((r) => r.userId === data.userId);
  if (alreadyReviewed) return { error: "User has already reviewed this item" };

  const review: Review = {
    id: uuidv4(),
    itemId,
    userId: data.userId,
    rating: data.rating,
    comment: data.comment,
    createdAt: new Date().toISOString(),
  };

  itemReviews.push(review);
  reviews.set(itemId, itemReviews);
  return review;
}

export function getReviews(itemId: string): Review[] {
  return reviews.get(itemId) ?? [];
}

function getAverageRating(itemId: string): number {
  const itemReviews = reviews.get(itemId) ?? [];
  if (itemReviews.length === 0) return 0;
  return itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
}

/** Reset all stores — for testing only */
export function _resetStores(): void {
  items.clear();
  reviews.clear();
  transactions.length = 0;
  creatorBalances.clear();
  payoutRequests.length = 0;
}
