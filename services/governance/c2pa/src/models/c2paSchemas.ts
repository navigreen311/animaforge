import { z } from 'zod';

/** Asset bytes may arrive inline (small stills) or as a path (video, large stills). */
const AssetFields = {
  asset_base64: z.string().min(1).optional(),
  asset_path: z.string().min(1).optional(),
  mime_type: z.string().min(1).optional(),
  output_path: z.string().min(1).optional(),
};

export const SignRequestSchema = z.object({
  job_id: z.string().uuid(),
  project_id: z.string().uuid(),
  shot_id: z.string().uuid(),
  model_id: z.string().min(1),
  input_hash: z.string().min(1),
  user_id: z.string().uuid(),
  consent_ids: z.array(z.string().uuid()).min(1),
  output_url: z.string().url(),
  watermark_id: z.string().min(1).optional(),
  ...AssetFields,
});

export type SignRequest = z.infer<typeof SignRequestSchema>;

export const VerifyAssetRequestSchema = z
  .object(AssetFields)
  .refine((v) => v.asset_base64 || v.asset_path, {
    message: 'asset_base64 or asset_path is required',
  });

export type VerifyAssetRequest = z.infer<typeof VerifyAssetRequestSchema>;

/** How a provenance record came to exist. */
export type ProvenanceMode =
  /** A real COSE-signed C2PA manifest was embedded into the asset bytes. */
  | 'c2pa-embedded'
  /** Credentials are present but no asset was supplied, so nothing was signed. */
  | 'unsigned-record'
  /** No usable signer: the record is metadata only and carries no cryptographic weight. */
  | 'degraded';

export interface SignatureSummary {
  algorithm: string | null;
  issuer: string | null;
  cert_serial_number: string | null;
  timestamp: string | null;
}

/** The C2PA manifest definition we asked the signer to embed. */
export interface ManifestDefinition {
  claim_generator: string;
  format: string;
  title: string;
  assertions: Array<{ label: string; data: Record<string, unknown> }>;
}

export interface StoredManifestEntry {
  output_id: string;
  job_id: string;
  project_id: string;
  shot_id: string;
  model_id: string;
  user_id_hash: string;
  consent_ids: string[];
  output_url: string;
  mode: ProvenanceMode;
  signed: boolean;
  embedded: boolean;
  format: string;
  manifest: ManifestDefinition;
  manifest_label: string | null;
  signature: SignatureSummary | null;
  asset_sha256: string | null;
  signed_asset_sha256: string | null;
  asset_path: string | null;
  degraded_reason: string | null;
  created_at: string;
}

export interface SignResponse extends StoredManifestEntry {
  manifest_url: string;
  degraded: boolean;
  /** Base64 of the signed asset, when it was supplied and returned inline. */
  asset_base64?: string;
  output_path?: string;
  warning?: string;
}

export type VerificationStatus = 'valid' | 'invalid' | 'absent' | 'unverified' | 'not_found';

export interface VerifyResponse {
  status: VerificationStatus;
  /**
   * True ONLY when the c2pa library parsed an embedded manifest and reported no
   * validation errors. A stored record alone can never set this.
   */
  cryptographically_verified: boolean;
  /** Backwards-compatible alias for `status === "valid"`. */
  valid: boolean;
  /** True when a provenance record exists in our own database. */
  record_found: boolean;
  reason: string | null;
  manifest: ManifestDefinition | null;
  manifest_label: string | null;
  signature: SignatureSummary | null;
  generator: string | null;
  created_at: string | null;
  model_id: string | null;
  mode: ProvenanceMode | null;
  validation_status: Array<{
    code?: string;
    explanation?: string;
    url?: string;
  }>;
}
