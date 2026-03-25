import { z } from "zod";

export const StyleMode = z.enum([
  "realistic",
  "anime",
  "cartoon",
  "cel",
  "pixel",
]);
export type StyleMode = z.infer<typeof StyleMode>;

export const RightsStatus = z.enum([
  "original",
  "licensed",
  "pending_clearance",
  "restricted",
]);
export type RightsStatus = z.infer<typeof RightsStatus>;

export const BodyParams = z
  .object({
    height: z.number().positive().optional(),
    build: z.string().optional(),
    skinTone: z.string().optional(),
  })
  .optional();

export const HairParams = z
  .object({
    style: z.string().optional(),
    color: z.string().optional(),
    length: z.string().optional(),
  })
  .optional();

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(200),
  projectId: z.string().uuid(),
  styleMode: StyleMode,
  isDigitalTwin: z.boolean().default(false),
  bodyParams: BodyParams,
  hairParams: HairParams,
  wardrobe: z.array(z.string()).optional(),
  voiceId: z.string().optional(),
});
export type CreateCharacterInput = z.infer<typeof CreateCharacterSchema>;

export const UpdateCharacterSchema = CreateCharacterSchema.partial();
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterSchema>;

export interface Character extends CreateCharacterInput {
  id: string;
  ownerId: string;
  rightsStatus: RightsStatus;
  createdAt: string;
  updatedAt: string;
}
