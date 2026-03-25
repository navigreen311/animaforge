import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import prisma from "../db";

// -- Schemas --

export const CreateProfileSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string()).min(1),
  portfolio: z.array(z.string().url()),
  rates: z.object({ hourly: z.number().min(0).optional(), daily: z.number().min(0).optional(), project: z.number().min(0).optional() }),
  availability: z.enum(["available", "busy", "unavailable"]),
});

export const SearchTalentSchema = z.object({
  skill: z.string().optional(),
  availability: z.string().optional(),
  minRate: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateBookingSchema = z.object({
  talentId: z.string().uuid(),
  projectId: z.string().uuid(),
  scope: z.string().min(1),
  dates: z.object({ start: z.string(), end: z.string() }),
  rate: z.number().min(0),
});

export const UpdateBookingStatusSchema = z.object({ status: z.enum(["accepted", "declined", "completed"]) });

export const ReviewTalentSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  reviewerId: z.string().uuid(),
});

export const MatchTalentSchema = z.object({
  skills: z.array(z.string()).min(1),
  minRating: z.number().min(0).max(5).optional(),
  availability: z.enum(["available", "busy", "unavailable"]).optional(),
  maxRate: z.number().optional(),
});

export const CreateContractSchema = z.object({
  bookingId: z.string().uuid(),
  terms: z.object({
    deliverables: z.array(z.string()).min(1),
    milestones: z.array(z.object({ name: z.string(), dueDate: z.string(), amount: z.number().min(0) })).optional(),
    paymentTerms: z.string(),
    cancellationPolicy: z.string().optional(),
  }),
});

export const PortfolioItemSchema = z.object({
  title: z.string().min(1), description: z.string().min(1), url: z.string().url(),
  thumbnailUrl: z.string().url().optional(), tags: z.array(z.string()).optional(),
});

export const SetAvailabilitySchema = z.object({
  dates: z.array(z.string()).min(1),
  status: z.enum(["available", "busy", "unavailable"]),
});

// -- Types --

export interface TalentProfile {
  id: string; name: string; skills: string[]; portfolio: string[];
  rates: { hourly?: number; daily?: number; project?: number };
  availability: "available" | "busy" | "unavailable";
  averageRating: number; reviewCount: number; createdAt: string;
}

export interface Booking {
  id: string; talentId: string; projectId: string; scope: string;
  dates: { start: string; end: string }; rate: number;
  status: "pending" | "accepted" | "declined" | "completed"; createdAt: string;
}

export interface TalentReview {
  id: string; talentId: string; reviewerId: string; rating: number; comment: string; createdAt: string;
}

export interface Contract {
  id: string; bookingId: string; talentId: string; projectId: string;
  terms: { deliverables: string[]; milestones?: { name: string; dueDate: string; amount: number }[];
    paymentTerms: string; cancellationPolicy?: string; };
  status: "draft" | "active" | "completed" | "cancelled"; createdAt: string; signedAt?: string;
}

export interface PortfolioItem {
  id: string; talentId: string; title: string; description: string;
  url: string; thumbnailUrl?: string; tags: string[]; createdAt: string;
}

export interface AvailabilityEntry { talentId: string; date: string; status: "available" | "busy" | "unavailable"; }

export interface TalentRatingResult {
  talentId: string; weightedAverage: number; totalReviews: number; breakdown: { [stars: number]: number };
}

// -- In-Memory Stores --

const profiles: Map<string, TalentProfile> = new Map();
const bookings: Map<string, Booking> = new Map();
const reviews: Map<string, TalentReview[]> = new Map();
const contracts: Map<string, Contract> = new Map();
const portfolioItems: Map<string, PortfolioItem[]> = new Map();
const availabilityCalendar: Map<string, AvailabilityEntry[]> = new Map();

// -- Prisma Availability --

let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try { await prisma.$queryRaw`SELECT 1`; prismaAvailable = true; }
  catch { console.warn("[talent] Prisma unavailable -- falling back to in-memory store"); prismaAvailable = false; }
  return prismaAvailable;
}

export function resetPrismaCheck(): void { prismaAvailable = null; }

// -- Service: Create Profile --

export async function createProfile(data: z.infer<typeof CreateProfileSchema>): Promise<TalentProfile> {
  const id = uuidv4();
  const now = new Date().toISOString();
  if (await isPrismaAvailable()) {
    try {
      await prisma.talentProfile.create({
        data: { id, name: data.name, skills: data.skills, portfolio: data.portfolio,
          rates: data.rates as any, availability: data.availability, averageRating: 0, reviewCount: 0 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[talent] Prisma createProfile failed, using in-memory:", msg);
    }
  }
  const profile: TalentProfile = { id, ...data, averageRating: 0, reviewCount: 0, createdAt: now };
  profiles.set(profile.id, profile);
  reviews.set(profile.id, []);
  portfolioItems.set(profile.id, []);
  availabilityCalendar.set(profile.id, []);
  return profile;
}

// -- Service: Get Profile --

export async function getProfile(id: string): Promise<TalentProfile | undefined> {
  if (await isPrismaAvailable()) {
    try {
      const db = await prisma.talentProfile.findUnique({ where: { id } });
      if (db) {
        const rates = (db.rates as any) ?? {};
        return { id: db.id, name: db.name, skills: db.skills as string[], portfolio: db.portfolio as string[],
          rates: { hourly: rates.hourly, daily: rates.daily, project: rates.project },
          availability: db.availability as TalentProfile["availability"],
          averageRating: typeof db.averageRating === "number" ? db.averageRating : Number(db.averageRating),
          reviewCount: db.reviewCount ?? 0,
          createdAt: db.createdAt instanceof Date ? db.createdAt.toISOString() : String(db.createdAt) };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[talent] Prisma getProfile failed, using in-memory:", msg);
    }
  }
  return profiles.get(id);
}

// -- Service: Search Talent --

export async function searchTalent(query: z.infer<typeof SearchTalentSchema>): Promise<{
  profiles: TalentProfile[]; total: number; page: number; limit: number;
}> {
  let results = Array.from(profiles.values());
  if (query.skill) { const s = query.skill.toLowerCase(); results = results.filter((p) => p.skills.some((sk) => sk.toLowerCase().includes(s))); }
  if (query.availability) results = results.filter((p) => p.availability === query.availability);
  if (query.minRate !== undefined) results = results.filter((p) => (p.rates.hourly ?? p.rates.daily ?? p.rates.project ?? 0) >= query.minRate!);
  if (query.maxRate !== undefined) results = results.filter((p) => (p.rates.hourly ?? p.rates.daily ?? p.rates.project ?? 0) <= query.maxRate!);
  const total = results.length;
  const start = (query.page - 1) * query.limit;
  return { profiles: results.slice(start, start + query.limit), total, page: query.page, limit: query.limit };
}

// -- Service: Create Booking --

export async function createBooking(data: z.infer<typeof CreateBookingSchema>): Promise<Booking | { error: string }> {
  const talent = profiles.get(data.talentId);
  if (!talent) return { error: "Talent not found" };
  if (talent.availability === "unavailable") return { error: "Talent is unavailable" };
  const booking: Booking = { id: uuidv4(), ...data, status: "pending", createdAt: new Date().toISOString() };
  bookings.set(booking.id, booking);
  if (await isPrismaAvailable()) {
    try {
      await prisma.talentBooking.create({
        data: { id: booking.id, talentId: booking.talentId, projectId: booking.projectId,
          scope: booking.scope, dates: booking.dates as any, rate: booking.rate, status: booking.status },
      });
    } catch (err: unknown) { console.warn("[talent] Prisma createBooking failed:", (err instanceof Error ? err.message : String(err))); }
  }
  return booking;
}

export function getProjectBookings(projectId: string): Booking[] {
  return Array.from(bookings.values()).filter((b) => b.projectId === projectId);
}

// -- Service: Update Booking Status --

export async function updateBookingStatus(bookingId: string, status: "accepted" | "declined" | "completed"): Promise<Booking | { error: string }> {
  const booking = bookings.get(bookingId);
  if (!booking) return { error: "Booking not found" };
  booking.status = status;
  if (status === "accepted") { const t = profiles.get(booking.talentId); if (t) t.availability = "busy"; }
  if (status === "completed" || status === "declined") { const t = profiles.get(booking.talentId); if (t) t.availability = "available"; }
  if (await isPrismaAvailable()) {
    try { await prisma.talentBooking.update({ where: { id: bookingId }, data: { status } }); }
    catch (err: unknown) { console.warn("[talent] Prisma updateBookingStatus failed:", (err instanceof Error ? err.message : String(err))); }
  }
  return booking;
}

// -- Service: Review Talent --

export function reviewTalent(talentId: string, data: { rating: number; comment: string; reviewerId: string }): TalentReview | { error: string } {
  const talent = profiles.get(talentId);
  if (!talent) return { error: "Talent not found" };
  const talentReviews = reviews.get(talentId) ?? [];
  if (talentReviews.some((r) => r.reviewerId === data.reviewerId)) return { error: "Already reviewed this talent" };
  const review: TalentReview = { id: uuidv4(), talentId, reviewerId: data.reviewerId, rating: data.rating, comment: data.comment, createdAt: new Date().toISOString() };
  talentReviews.push(review);
  reviews.set(talentId, talentReviews);
  talent.reviewCount = talentReviews.length;
  talent.averageRating = talentReviews.reduce((sum, r) => sum + r.rating, 0) / talentReviews.length;
  return review;
}

// -- NEW: Skill Matching --

export function matchTalent(requirements: { skills: string[]; minRating?: number; availability?: "available" | "busy" | "unavailable"; maxRate?: number }): TalentProfile[] {
  const requiredSkills = requirements.skills.map((s) => s.toLowerCase());
  let candidates = Array.from(profiles.values());
  candidates = requirements.availability ? candidates.filter((p) => p.availability === requirements.availability) : candidates.filter((p) => p.availability === "available");
  if (requirements.minRating !== undefined) candidates = candidates.filter((p) => p.averageRating >= requirements.minRating!);
  if (requirements.maxRate !== undefined) candidates = candidates.filter((p) => (p.rates.hourly ?? p.rates.daily ?? p.rates.project ?? 0) <= requirements.maxRate!);

  const scored = candidates.map((p) => {
    const ts = p.skills.map((s) => s.toLowerCase());
    const mc = requiredSkills.filter((req) => ts.some((t) => t.includes(req) || req.includes(t))).length;
    return { profile: p, matchRatio: mc / requiredSkills.length, matchCount: mc };
  });
  return scored.filter((s) => s.matchCount > 0).sort((a, b) => b.matchRatio - a.matchRatio || b.profile.averageRating - a.profile.averageRating).map((s) => s.profile);
}

// -- NEW: Contract Management --

export function createContract(bookingId: string, terms: Contract["terms"]): Contract | { error: string } {
  const booking = bookings.get(bookingId);
  if (!booking) return { error: "Booking not found" };
  if (Array.from(contracts.values()).find((c) => c.bookingId === bookingId)) return { error: "Contract already exists for this booking" };
  const contract: Contract = { id: uuidv4(), bookingId, talentId: booking.talentId, projectId: booking.projectId, terms, status: "draft", createdAt: new Date().toISOString() };
  contracts.set(contract.id, contract);
  return contract;
}

export function getContract(contractId: string): Contract | undefined { return contracts.get(contractId); }
export function getBookingContract(bookingId: string): Contract | undefined { return Array.from(contracts.values()).find((c) => c.bookingId === bookingId); }

export function signContract(contractId: string): Contract | { error: string } {
  const c = contracts.get(contractId);
  if (!c) return { error: "Contract not found" };
  if (c.status !== "draft") return { error: "Contract is not in draft status" };
  c.status = "active"; c.signedAt = new Date().toISOString();
  return c;
}

export function completeContract(contractId: string): Contract | { error: string } {
  const c = contracts.get(contractId);
  if (!c) return { error: "Contract not found" };
  if (c.status !== "active") return { error: "Contract is not active" };
  c.status = "completed";
  return c;
}

// -- NEW: Portfolio Management --

export function addPortfolioItem(talentId: string, item: z.infer<typeof PortfolioItemSchema>): PortfolioItem | { error: string } {
  if (!profiles.has(talentId)) return { error: "Talent not found" };
  const pi: PortfolioItem = { id: uuidv4(), talentId, title: item.title, description: item.description, url: item.url, thumbnailUrl: item.thumbnailUrl, tags: item.tags ?? [], createdAt: new Date().toISOString() };
  const arr = portfolioItems.get(talentId) ?? [];
  arr.push(pi);
  portfolioItems.set(talentId, arr);
  return pi;
}

export function getPortfolio(talentId: string): PortfolioItem[] { return portfolioItems.get(talentId) ?? []; }

export function removePortfolioItem(talentId: string, itemId: string): { success: boolean } | { error: string } {
  const arr = portfolioItems.get(talentId);
  if (!arr) return { error: "Talent not found" };
  const idx = arr.findIndex((i) => i.id === itemId);
  if (idx === -1) return { error: "Portfolio item not found" };
  arr.splice(idx, 1);
  return { success: true };
}

// -- NEW: Availability Calendar --

export function setAvailability(talentId: string, dates: string[], status: "available" | "busy" | "unavailable"): AvailabilityEntry[] | { error: string } {
  if (!profiles.has(talentId)) return { error: "Talent not found" };
  const calendar = availabilityCalendar.get(talentId) ?? [];
  const updated: AvailabilityEntry[] = [];
  for (const date of dates) {
    const idx = calendar.findIndex((e) => e.date === date);
    const entry: AvailabilityEntry = { talentId, date, status };
    if (idx >= 0) calendar[idx] = entry; else calendar.push(entry);
    updated.push(entry);
  }
  calendar.sort((a, b) => a.date.localeCompare(b.date));
  availabilityCalendar.set(talentId, calendar);
  return updated;
}

export function getAvailability(talentId: string, startDate?: string, endDate?: string): AvailabilityEntry[] {
  const cal = availabilityCalendar.get(talentId) ?? [];
  if (!startDate && !endDate) return cal;
  return cal.filter((e) => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate));
}

// -- NEW: Rating Aggregation --

export function getTalentRating(talentId: string): TalentRatingResult | { error: string } {
  if (!profiles.has(talentId)) return { error: "Talent not found" };
  const tr = reviews.get(talentId) ?? [];
  if (tr.length === 0) return { talentId, weightedAverage: 0, totalReviews: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  const breakdown: { [s: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of tr) breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;

  let wSum = 0, wTotal = 0;
  const sorted = [...tr].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (let i = 0; i < sorted.length; i++) { const w = i + 1; wSum += sorted[i].rating * w; wTotal += w; }
  return { talentId, weightedAverage: wTotal > 0 ? +(wSum / wTotal).toFixed(2) : 0, totalReviews: tr.length, breakdown };
}

/** Reset all stores -- for testing only */
export function _resetStores(): void {
  profiles.clear(); bookings.clear(); reviews.clear(); contracts.clear();
  portfolioItems.clear(); availabilityCalendar.clear(); prismaAvailable = null;
}
