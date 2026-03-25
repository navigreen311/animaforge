import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────

export const CreateProfileSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string()).min(1),
  portfolio: z.array(z.string().url()),
  rates: z.object({
    hourly: z.number().min(0).optional(),
    daily: z.number().min(0).optional(),
    project: z.number().min(0).optional(),
  }),
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
  dates: z.object({
    start: z.string(),
    end: z.string(),
  }),
  rate: z.number().min(0),
});

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(["accepted", "declined", "completed"]),
});

export const ReviewTalentSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  reviewerId: z.string().uuid(),
});

// ── Types ────────────────────────────────────────────────────────────

export interface TalentProfile {
  id: string;
  name: string;
  skills: string[];
  portfolio: string[];
  rates: { hourly?: number; daily?: number; project?: number };
  availability: "available" | "busy" | "unavailable";
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  talentId: string;
  projectId: string;
  scope: string;
  dates: { start: string; end: string };
  rate: number;
  status: "pending" | "accepted" | "declined" | "completed";
  createdAt: string;
}

export interface TalentReview {
  id: string;
  talentId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ── In-Memory Stores ─────────────────────────────────────────────────

const profiles: Map<string, TalentProfile> = new Map();
const bookings: Map<string, Booking> = new Map();
const reviews: Map<string, TalentReview[]> = new Map(); // talentId -> reviews

// ── Service ──────────────────────────────────────────────────────────

export function createProfile(data: z.infer<typeof CreateProfileSchema>): TalentProfile {
  const profile: TalentProfile = {
    id: uuidv4(),
    ...data,
    averageRating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  };
  profiles.set(profile.id, profile);
  reviews.set(profile.id, []);
  return profile;
}

export function getProfile(id: string): TalentProfile | undefined {
  return profiles.get(id);
}

export function searchTalent(query: z.infer<typeof SearchTalentSchema>): {
  profiles: TalentProfile[];
  total: number;
  page: number;
  limit: number;
} {
  let results = Array.from(profiles.values());

  if (query.skill) {
    const skill = query.skill.toLowerCase();
    results = results.filter((p) => p.skills.some((s) => s.toLowerCase().includes(skill)));
  }
  if (query.availability) {
    results = results.filter((p) => p.availability === query.availability);
  }
  if (query.minRate !== undefined) {
    results = results.filter((p) => {
      const rate = p.rates.hourly ?? p.rates.daily ?? p.rates.project ?? 0;
      return rate >= query.minRate!;
    });
  }
  if (query.maxRate !== undefined) {
    results = results.filter((p) => {
      const rate = p.rates.hourly ?? p.rates.daily ?? p.rates.project ?? 0;
      return rate <= query.maxRate!;
    });
  }

  const total = results.length;
  const start = (query.page - 1) * query.limit;
  const paged = results.slice(start, start + query.limit);

  return { profiles: paged, total, page: query.page, limit: query.limit };
}

export function createBooking(data: z.infer<typeof CreateBookingSchema>): Booking | { error: string } {
  const talent = profiles.get(data.talentId);
  if (!talent) return { error: "Talent not found" };
  if (talent.availability === "unavailable") return { error: "Talent is unavailable" };

  const booking: Booking = {
    id: uuidv4(),
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  bookings.set(booking.id, booking);
  return booking;
}

export function getProjectBookings(projectId: string): Booking[] {
  return Array.from(bookings.values()).filter((b) => b.projectId === projectId);
}

export function updateBookingStatus(
  bookingId: string,
  status: "accepted" | "declined" | "completed"
): Booking | { error: string } {
  const booking = bookings.get(bookingId);
  if (!booking) return { error: "Booking not found" };

  booking.status = status;

  // Update talent availability on accept
  if (status === "accepted") {
    const talent = profiles.get(booking.talentId);
    if (talent) talent.availability = "busy";
  }
  if (status === "completed" || status === "declined") {
    const talent = profiles.get(booking.talentId);
    if (talent) talent.availability = "available";
  }

  return booking;
}

export function reviewTalent(
  talentId: string,
  data: { rating: number; comment: string; reviewerId: string }
): TalentReview | { error: string } {
  const talent = profiles.get(talentId);
  if (!talent) return { error: "Talent not found" };

  const talentReviews = reviews.get(talentId) ?? [];
  const alreadyReviewed = talentReviews.some((r) => r.reviewerId === data.reviewerId);
  if (alreadyReviewed) return { error: "Already reviewed this talent" };

  const review: TalentReview = {
    id: uuidv4(),
    talentId,
    reviewerId: data.reviewerId,
    rating: data.rating,
    comment: data.comment,
    createdAt: new Date().toISOString(),
  };

  talentReviews.push(review);
  reviews.set(talentId, talentReviews);

  // Update average rating
  talent.reviewCount = talentReviews.length;
  talent.averageRating =
    talentReviews.reduce((sum, r) => sum + r.rating, 0) / talentReviews.length;

  return review;
}

/** Reset all stores — for testing only */
export function _resetStores(): void {
  profiles.clear();
  bookings.clear();
  reviews.clear();
}
