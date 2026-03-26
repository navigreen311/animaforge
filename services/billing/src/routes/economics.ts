import { Router, Request, Response } from "express";
import { z } from "zod";
import * as economics from "../services/economicsEngine";

const router = Router();

// --------------- Validation Schemas ---------------

const EconJobTypeSchema = z.enum([
  "video_preview",
  "video_final",
  "audio",
  "avatar",
  "style",
]);

const EconTierSchema = z.enum([
  "free",
  "starter",
  "creator",
  "pro",
  "studio",
  "enterprise",
]);

const GpuClassSchema = z.enum(["CPU", "T4", "A10G", "A100", "H100"]);

const JobParamsSchema = z.object({
  gpuClass: GpuClassSchema.optional(),
  durationSec: z.number().positive().optional(),
  resolutionMultiplier: z.number().positive().optional(),
  deliveryGB: z.number().nonnegative().optional(),
});

const EstimateJobSchema = z.object({
  jobType: EconJobTypeSchema,
  tier: EconTierSchema,
  params: JobParamsSchema.optional(),
});

const ShotEstimateSchema = z.object({
  shotId: z.string().min(1),
  jobType: EconJobTypeSchema,
  tier: EconTierSchema,
  params: JobParamsSchema.optional(),
});

const ProjectEstimateSchema = z.object({
  projectId: z.string().min(1),
  shots: z.array(ShotEstimateSchema).min(1),
});

const SaleSchema = z.object({
  saleId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
});

const PayoutSchema = z.object({
  creatorId: z.string().min(1),
  amount: z.number().positive(),
});

const RevShareSchema = z.object({
  creatorId: z.string().min(1),
  sales: z.array(SaleSchema).min(1),
});

// --------------- Routes ---------------

// POST /billing/economics/estimate — estimate job cost
router.post("/estimate", (req: Request, res: Response) => {
  const parsed = EstimateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = economics.calculateJobCost(
      parsed.data.jobType,
      parsed.data.tier,
      parsed.data.params ?? {},
    );
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// POST /billing/economics/project-estimate — estimate project cost
router.post("/project-estimate", (req: Request, res: Response) => {
  const parsed = ProjectEstimateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const shots = parsed.data.shots.map((s) => ({
      ...s,
      params: s.params ?? {},
    }));
    const result = economics.estimateProjectCost(parsed.data.projectId, shots);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// GET /billing/economics/usage/:userId — usage report
router.get("/usage/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
  const report = economics.getUsageReport(userId, period);
  res.json(report);
});

// GET /billing/economics/optimize/:userId — cost optimization suggestions
router.get("/optimize/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const suggestions = economics.optimizeCostSuggestions(userId);
  res.json({ suggestions });
});

// GET /billing/economics/rev-share/:creatorId — calculate revenue share
router.get("/rev-share/:creatorId", (req: Request, res: Response) => {
  const parsed = RevShareSchema.safeParse(req.body);
  if (!parsed.success) {
    // If no body provided, return empty rev-share
    res.json({
      grossRevenue: 0,
      platformFee: 0,
      creatorShare: 0,
      pendingPayout: 0,
    });
    return;
  }
  const result = economics.calculateRevShare(
    parsed.data.creatorId,
    parsed.data.sales,
  );
  res.json(result);
});

// POST /billing/economics/payout — process creator payout
router.post("/payout", (req: Request, res: Response) => {
  const parsed = PayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = economics.processCreatorPayout(
      parsed.data.creatorId,
      parsed.data.amount,
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// GET /billing/economics/payouts/:creatorId — payout history
router.get("/payouts/:creatorId", (req: Request, res: Response) => {
  const creatorId = req.params.creatorId as string;
  const history = economics.getPayoutHistory(creatorId);
  res.json({ payouts: history });
});

// GET /billing/economics/platform-revenue — platform revenue (admin)
router.get("/platform-revenue", (req: Request, res: Response) => {
  const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
  const report = economics.getPlatformRevenue(period);
  res.json(report);
});

export default router;
