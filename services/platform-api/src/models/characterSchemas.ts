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

/**
 * Body proportions. `estimatedStature` and friends are written by the X5
 * pipeline's body-estimation step; the rest are author-editable.
 */
export const BodyParams = z
  .object({
    height: z.number().positive().optional(),
    build: z.string().optional(),
    skinTone: z.string().optional(),
    estimatedStatureM: z.number().positive().optional(),
    shoulderWidthM: z.number().positive().optional(),
    inseamM: z.number().positive().optional(),
  })
  .passthrough()
  .optional();

/**
 * Hair state as edited by the Hair tab.
 *
 * `length` accepts a string or a number: the original API took descriptive
 * values ("short"), while the Hair tab's slider produces a 0-100 percentage.
 * Both are stored as-is so neither client breaks the other.
 */
export const HairParams = z
  .object({
    style: z.string().optional(),
    color: z.string().optional(),
    length: z.union([z.string(), z.number()]).optional(),
    customHex: z.string().optional(),
    highlightsEnabled: z.boolean().optional(),
    highlightColor: z.string().optional(),
    texture: z.string().optional(),
    volume: z.number().min(0).max(100).optional(),
    shine: z.number().min(0).max(100).optional(),
    facialHairStyle: z.string().optional(),
    accessory: z.string().optional(),
  })
  .passthrough();
export type HairParamsInput = z.infer<typeof HairParams>;

/** One wardrobe item's material and fit detail. */
export const WardrobeItemDetail = z
  .object({
    fabric: z.string().optional(),
    color: z.string().optional(),
    pattern: z.string().optional(),
    fit: z.string().optional(),
  })
  .passthrough();

export const WardrobeSelection = z.object({
  item: z.string(),
  detail: WardrobeItemDetail.optional(),
});

export const WardrobePreset = z.object({
  id: z.string(),
  name: z.string(),
  selections: z.record(z.string(), WardrobeSelection),
});

/**
 * Wardrobe state as edited by the Wardrobe tab.
 *
 * Also accepts the original flat `string[]` form so existing callers and
 * stored records keep working.
 */
export const WardrobeObject = z
  .object({
    selections: z.record(z.string(), WardrobeSelection).optional(),
    presets: z.array(WardrobePreset).optional(),
  })
  .passthrough();

export const Wardrobe = z.union([z.array(z.string()), WardrobeObject]);
export type WardrobeInput = z.infer<typeof Wardrobe>;

/** Artifacts produced by the X5 avatar pipeline. */
export const AvatarArtifacts = z.object({
  gltfUrl: z.string().url().optional(),
  facsRigUrl: z.string().url().optional(),
  faceModelUrl: z.string().url().optional(),
  isDigitalTwin: z.boolean().optional(),
  styleMode: StyleMode.optional(),
  bodyParams: BodyParams,
});
export type AvatarArtifactsInput = z.infer<typeof AvatarArtifacts>;

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(200),
  projectId: z.string().uuid(),
  styleMode: StyleMode,
  isDigitalTwin: z.boolean().default(false),
  bodyParams: BodyParams,
  hairParams: HairParams.optional(),
  wardrobe: Wardrobe.optional(),
  voiceId: z.string().optional(),
  gltfUrl: z.string().url().optional(),
  facsRigUrl: z.string().url().optional(),
  faceModelUrl: z.string().url().optional(),
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
