import { z } from "zod";

export const SubscriptionTier = z.enum(["free", "starter", "pro", "enterprise"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTier>;

export const JobType = z.enum([
  "video_10s_preview",
  "video_10s_final",
  "video_30s_preview",
  "video_30s_final",
  "avatar_reconstruction",
  "style_clone",
  "img_to_cartoon",
  "script_generation",
  "music_30s",
  "audio_voice_30s",
  "auto_qc",
]);
export type JobType = z.infer<typeof JobType>;

export const SubscribeSchema = z.object({
  userId: z.string().min(1),
  tier: SubscriptionTier,
});

export const UpdateSubscriptionSchema = z.object({
  tier: SubscriptionTier,
});

export const TopUpSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
});

export const DeductCreditsSchema = z.object({
  userId: z.string().min(1),
  jobType: JobType,
  tier: SubscriptionTier,
});

export const StripeWebhookSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()).optional(),
});

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: "active" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface CreditBalance {
  userId: string;
  balance: number;
  usageThisPeriod: number;
  periodStart: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "topup" | "deduction";
  jobType?: string;
  createdAt: string;
}
