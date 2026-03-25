import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import prisma from "../db";

// -- Schemas --

export const ListItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "model", "animation", "texture", "rig", "scene", "plugin", "template",
    "style_pack", "character", "audio_pack",
  ]),
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

export const RateItemSchema = z.object({
  userId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().optional(),
});

// -- Types --

export interface MarketplaceItem {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  previewUrl: string;
  creatorId: string;
  status: "active" | "sold" | "removed";
  featured: boolean;
  category: string;
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
  processedAt?: string;
}

export interface SellerAnalytics {
  totalSales: number;
  totalRevenue: number;
  avgRating: number;
  topItems: { id: string; name: string; sales: number; revenue: number }[];
}

export type MarketplaceCategory =
  | "style_pack" | "template" | "character" | "audio_pack" | "plugin"
  | "model" | "animation" | "texture" | "rig" | "scene";

// -- Constants --

export const COMMISSION_RATE = 0.30;

export const CATEGORIES: { id: MarketplaceCategory; label: string; description: string }[] = [
  { id: "style_pack", label: "Style Packs", description: "Pre-built visual styles and themes" },
  { id: "template", label: "Templates", description: "Ready-made project templates" },
  { id: "character", label: "Characters", description: "Character models and rigs" },
  { id: "audio_pack", label: "Audio Packs", description: "Sound effects and music collections" },
  { id: "plugin", label: "Plugins", description: "Extensions and add-ons" },
  { id: "model", label: "Models", description: "3D models and assets" },
  { id: "animation", label: "Animations", description: "Animation clips and sequences" },
  { id: "texture", label: "Textures", description: "Texture maps and materials" },
  { id: "rig", label: "Rigs", description: "Character and object rigs" },
  { id: "scene", label: "Scenes", description: "Complete scene setups" },
];

// -- In-Memory Stores --

const items: Map<string, MarketplaceItem> = new Map();
const reviews: Map<string, Review[]> = new Map();
const transactions: Transaction[] = [];
const creatorBalances: Map<string, CreatorBalance> = new Map();
const payoutRequests: PayoutRequest[] = [];

// -- Prisma Availability --

let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaAvailable = true;
  } catch {
    console.warn("[marketplace] Prisma unavailable -- falling back to in-memory store");
    prismaAvailable = false;
  }
  return prismaAvailable;
}

export function resetPrismaCheck(): void { prismaAvailable = null; }

// -- Helpers --

function getOrCreateBalance(creatorId: string): CreatorBalance {
  if (!creatorBalances.has(creatorId)) {
    creatorBalances.set(creatorId, { total: 0, pending: 0, paid: 0, transactions: [] });
  }
  return creatorBalances.get(creatorId)!;
}

function getAverageRating(itemId: string): number {
  const itemReviews = reviews.get(itemId) ?? [];
  if (itemReviews.length === 0) return 0;
  return itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
}

function mapCategoryFromType(type: string): string { return type; }

// -- Service: List Item --

export async function listItem(data: z.infer<typeof ListItemSchema>): Promise<MarketplaceItem> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const category = mapCategoryFromType(data.type);

  if (await isPrismaAvailable()) {
    try {
      await prisma.marketplaceItem.create({
        data: { id, name: data.name, type: data.type, price: data.price,
          description: data.description, previewUrl: data.previewUrl,
          creatorId: data.creatorId, status: "active", featured: false, category, purchaseCount: 0 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[marketplace] Prisma listItem failed, using in-memory:", msg);
    }
  }

  const item: MarketplaceItem = {
    id, ...data, status: "active", featured: false, category, createdAt: now, purchaseCount: 0,
  };
  items.set(item.id, item);
  reviews.set(item.id, []);
  return item;
}

// -- Service: Get Item --

export async function getItem(id: string): Promise<MarketplaceItem | undefined> {
  if (await isPrismaAvailable()) {
    try {
      const dbItem = await prisma.marketplaceItem.findUnique({ where: { id } });
      if (dbItem) {
        return {
          id: dbItem.id, name: dbItem.name, type: dbItem.type,
          price: typeof dbItem.price === "number" ? dbItem.price : Number(dbItem.price),
          description: dbItem.description, previewUrl: dbItem.previewUrl,
          creatorId: dbItem.creatorId,
          status: dbItem.status as MarketplaceItem["status"],
          featured: dbItem.featured ?? false,
          category: dbItem.category ?? dbItem.type,
          createdAt: dbItem.createdAt instanceof Date ? dbItem.createdAt.toISOString() : String(dbItem.createdAt),
          purchaseCount: dbItem.purchaseCount ?? 0,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[marketplace] Prisma getItem failed, using in-memory:", msg);
    }
  }
  return items.get(id);
}

// -- Service: Search Items --

export async function searchItems(query: z.infer<typeof SearchSchema>): Promise<{
  items: MarketplaceItem[]; total: number; page: number; limit: number;
}> {
  let results = Array.from(items.values()).filter((i) => i.status === "active");
  if (query.type) results = results.filter((i) => i.type === query.type);
  if (query.minPrice !== undefined) results = results.filter((i) => i.price >= query.minPrice!);
  if (query.maxPrice !== undefined) results = results.filter((i) => i.price <= query.maxPrice!);

  switch (query.sort) {
    case "price_asc": results.sort((a, b) => a.price - b.price); break;
    case "price_desc": results.sort((a, b) => b.price - a.price); break;
    case "newest": results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    case "rating": results.sort((a, b) => getAverageRating(b.id) - getAverageRating(a.id)); break;
    default: results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = results.length;
  const start = (query.page - 1) * query.limit;
  return { items: results.slice(start, start + query.limit), total, page: query.page, limit: query.limit };
}

// -- Service: Purchase Item --

export async function purchaseItem(
  itemId: string, buyerId: string,
): Promise<{ transaction: Transaction; item: MarketplaceItem } | { error: string }> {
  const item = items.get(itemId);
  if (!item) return { error: "Item not found" };
  if (item.status !== "active") return { error: "Item is not available for purchase" };
  if (item.creatorId === buyerId) return { error: "Cannot purchase your own item" };

  const commission = +(item.price * COMMISSION_RATE).toFixed(2);
  const sellerEarning = +(item.price - commission).toFixed(2);
  const tx: Transaction = {
    id: uuidv4(), itemId, buyerId, sellerId: item.creatorId,
    amount: item.price, commission, sellerEarning, createdAt: new Date().toISOString(),
  };
  transactions.push(tx);
  item.purchaseCount += 1;

  const balance = getOrCreateBalance(item.creatorId);
  balance.total += sellerEarning;
  balance.pending += sellerEarning;
  balance.transactions.push(tx);

  if (await isPrismaAvailable()) {
    try {
      await prisma.marketplaceItem.update({ where: { id: itemId }, data: { purchaseCount: { increment: 1 } } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[marketplace] Prisma purchaseItem failed:", msg);
    }
  }
  return { transaction: tx, item };
}

export function getCreatorEarnings(creatorId: string): CreatorBalance { return getOrCreateBalance(creatorId); }

export function getCreatorListings(creatorId: string): MarketplaceItem[] {
  return Array.from(items.values()).filter((i) => i.creatorId === creatorId);
}

export function requestPayout(creatorId: string, amount: number): PayoutRequest | { error: string } {
  const balance = getOrCreateBalance(creatorId);
  if (amount > balance.pending) return { error: "Insufficient pending balance" };
  const payout: PayoutRequest = { id: uuidv4(), creatorId, amount, status: "pending", createdAt: new Date().toISOString() };
  balance.pending -= amount;
  balance.paid += amount;
  payoutRequests.push(payout);
  return payout;
}

export function submitReview(
  itemId: string, data: { rating: number; comment: string; userId: string },
): Review | { error: string } {
  if (!items.has(itemId)) return { error: "Item not found" };
  const itemReviews = reviews.get(itemId) ?? [];
  if (itemReviews.some((r) => r.userId === data.userId)) return { error: "User has already reviewed this item" };
  const review: Review = {
    id: uuidv4(), itemId, userId: data.userId, rating: data.rating, comment: data.comment, createdAt: new Date().toISOString(),
  };
  itemReviews.push(review);
  reviews.set(itemId, itemReviews);
  return review;
}

export function getReviews(itemId: string): Review[] { return reviews.get(itemId) ?? []; }

// -- NEW: Featured Items --

export async function getFeaturedItems(): Promise<MarketplaceItem[]> {
  const allActive = Array.from(items.values()).filter((i) => i.status === "active");
  const featured = allActive.filter((i) => i.featured);
  if (featured.length > 0) return featured;

  const curated = allActive
    .filter((i) => i.purchaseCount > 0)
    .map((i) => ({ item: i, rating: getAverageRating(i.id) }))
    .filter((e) => e.rating >= 3.5)
    .sort((a, b) => b.rating - a.rating || b.item.purchaseCount - a.item.purchaseCount)
    .slice(0, 10).map((e) => e.item);

  if (curated.length === 0) {
    return allActive.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  }
  return curated;
}

// -- NEW: Categories --

export function getCategories(): typeof CATEGORIES { return CATEGORIES; }

// -- NEW: Seller Analytics --

export function getSellerAnalytics(creatorId: string): SellerAnalytics {
  const creatorItems = Array.from(items.values()).filter((i) => i.creatorId === creatorId);
  const creatorTxs = transactions.filter((tx) => tx.sellerId === creatorId);
  const totalSales = creatorTxs.length;
  const totalRevenue = creatorTxs.reduce((sum, tx) => sum + tx.sellerEarning, 0);

  let totalRating = 0, ratingCount = 0;
  for (const item of creatorItems) {
    for (const r of (reviews.get(item.id) ?? [])) { totalRating += r.rating; ratingCount++; }
  }
  const avgRating = ratingCount > 0 ? +(totalRating / ratingCount).toFixed(2) : 0;

  const itemRevenue = new Map<string, number>();
  const itemSales = new Map<string, number>();
  for (const tx of creatorTxs) {
    itemRevenue.set(tx.itemId, (itemRevenue.get(tx.itemId) ?? 0) + tx.sellerEarning);
    itemSales.set(tx.itemId, (itemSales.get(tx.itemId) ?? 0) + 1);
  }
  const topItems = creatorItems.filter((i) => itemRevenue.has(i.id))
    .map((i) => ({ id: i.id, name: i.name, sales: itemSales.get(i.id) ?? 0, revenue: +(itemRevenue.get(i.id) ?? 0).toFixed(2) }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return { totalSales, totalRevenue: +totalRevenue.toFixed(2), avgRating, topItems };
}

// -- NEW: Process Payouts --

export async function processPayouts(): Promise<{
  processed: number; totalAmount: number;
  results: { id: string; creatorId: string; amount: number; status: string }[];
}> {
  const pending = payoutRequests.filter((p) => p.status === "pending");
  let totalAmount = 0;
  const results: { id: string; creatorId: string; amount: number; status: string }[] = [];
  for (const payout of pending) {
    payout.status = "paid";
    payout.processedAt = new Date().toISOString();
    totalAmount += payout.amount;
    results.push({ id: payout.id, creatorId: payout.creatorId, amount: payout.amount, status: "paid" });
  }
  return { processed: results.length, totalAmount: +totalAmount.toFixed(2), results };
}

// -- NEW: Rate Item (with duplicate check) --

export function rateItem(itemId: string, userId: string, rating: number, review?: string): Review | { error: string } {
  if (!items.has(itemId)) return { error: "Item not found" };
  if (rating < 1 || rating > 5) return { error: "Rating must be between 1 and 5" };
  const itemReviews = reviews.get(itemId) ?? [];
  if (itemReviews.find((r) => r.userId === userId)) return { error: "User has already rated this item" };
  const newReview: Review = { id: uuidv4(), itemId, userId, rating, comment: review ?? "", createdAt: new Date().toISOString() };
  itemReviews.push(newReview);
  reviews.set(itemId, itemReviews);
  return newReview;
}

/** Reset all stores -- for testing only */
export function _resetStores(): void {
  items.clear(); reviews.clear(); transactions.length = 0;
  creatorBalances.clear(); payoutRequests.length = 0; prismaAvailable = null;
}
