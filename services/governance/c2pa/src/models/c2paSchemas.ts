import { z } from "zod";

export const SignRequestSchema = z.object({
  job_id: z.string().uuid(),
  project_id: z.string().uuid(),
  shot_id: z.string().uuid(),
  model_id: z.string().min(1),
  input_hash: z.string().min(1),
  user_id: z.string().uuid(),
  consent_ids: z.array(z.string().uuid()).min(1),
  output_url: z.string().url(),
});

export type SignRequest = z.infer<typeof SignRequestSchema>;

export interface C2PAManifest {
  "@context": string[];
  "dc:title": string;
  "c2pa:claim": {
    claim_generator: string;
    claim_generator_version: string;
    signature_type: string;
    created_at: string;
    assertions: C2PAAssertion[];
  };
  "animaforge:metadata": {
    job_id: string;
    project_id: string;
    shot_id: string;
    model_id: string;
    input_hash: string;
    user_id: string;
    consent_ids: string[];
    output_url: string;
  };
}

export interface C2PAAssertion {
  label: string;
  data: Record<string, unknown>;
}

export interface SignResponse {
  manifest: C2PAManifest;
  signature: string;
  manifest_url: string;
}

export interface VerifyResponse {
  valid: boolean;
  manifest: C2PAManifest | null;
  generator: string | null;
  created_at: string | null;
  model_id: string | null;
}

export interface StoredManifestEntry {
  manifest: C2PAManifest;
  signature: string;
  output_id: string;
  created_at: string;
}
