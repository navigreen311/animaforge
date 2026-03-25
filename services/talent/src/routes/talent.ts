import { Router, Request, Response } from "express";
import {
  CreateProfileSchema,
  SearchTalentSchema,
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  ReviewTalentSchema,
  createProfile,
  getProfile,
  searchTalent,
  createBooking,
  getProjectBookings,
  updateBookingStatus,
  reviewTalent,
} from "../services/talentService";

const router = Router();

// ── Profiles ─────────────────────────────────────────────────────────

/** POST /talent/profiles — create talent profile */
router.post("/profiles", (req: Request, res: Response) => {
  const parsed = CreateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const profile = createProfile(parsed.data);
  return res.status(201).json(profile);
});

/** GET /talent/profiles — search talent */
router.get("/profiles", (req: Request, res: Response) => {
  const parsed = SearchTalentSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const results = searchTalent(parsed.data);
  return res.json(results);
});

/** GET /talent/profiles/:id — talent detail */
router.get("/profiles/:id", (req: Request, res: Response) => {
  const profile = getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Talent not found" });
  return res.json(profile);
});

/** POST /talent/profiles/:id/review — review talent */
router.post("/profiles/:id/review", (req: Request, res: Response) => {
  const parsed = ReviewTalentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = reviewTalent(req.params.id, parsed.data);
  if ("error" in result) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

// ── Bookings ─────────────────────────────────────────────────────────

/** POST /talent/bookings — book talent */
router.post("/bookings", (req: Request, res: Response) => {
  const parsed = CreateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = createBooking(parsed.data);
  if ("error" in result) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result);
});

/** GET /talent/bookings/:projectId — bookings for project */
router.get("/bookings/:projectId", (req: Request, res: Response) => {
  const projectBookings = getProjectBookings(req.params.projectId);
  return res.json({ bookings: projectBookings });
});

/** PUT /talent/bookings/:id/status — accept/decline/complete booking */
router.put("/bookings/:id/status", (req: Request, res: Response) => {
  const parsed = UpdateBookingStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = updateBookingStatus(req.params.id, parsed.data.status);
  if ("error" in result) {
    return res.status(404).json({ error: result.error });
  }
  return res.json(result);
});

export default router;
