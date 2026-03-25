import { z } from "zod";

export const AssetType = z.enum([
  "image",
  "video",
  "audio",
  "3d_model",
  "texture",
  "motion_capture",
  "other",
]);
export type AssetType = z.infer<typeof AssetType>;

export const CreateAssetSchema = z.object({
  projectId: z.string().uuid(),
  type: AssetType,
  name: z.string().min(1).max(300),
  url: z.string().url(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export interface Asset extends CreateAssetInput {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
