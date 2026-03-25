import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  C2PAManifest,
  SignRequest,
  StoredManifestEntry,
  VerifyResponse,
} from "../models/c2paSchemas";

// In-memory manifest store keyed by job_id
const manifestStore = new Map<string, StoredManifestEntry>();
// Secondary index: output_id -> job_id
const outputIndex = new Map<string, string>();

export function createManifest(params: SignRequest): C2PAManifest {
  const now = new Date().toISOString();

  const manifest: C2PAManifest = {
    "@context": [
      "https://c2pa.org/statements/1.0",
      "https://www.w3.org/ns/activitystreams",
      "https://animaforge.ai/ns/governance/1.0",
    ],
    "dc:title": `AnimaForge AI-Generated Asset – Job ${params.job_id}`,
    "c2pa:claim": {
      claim_generator: "AnimaForge/C2PA-Signing-Service",
      claim_generator_version: "1.0.0",
      signature_type: "ECDSA-P256",
      created_at: now,
      assertions: [
        {
          label: "c2pa.actions",
          data: {
            actions: [
              {
                action: "c2pa.created",
                softwareAgent: "AnimaForge Pipeline",
                when: now,
              },
            ],
          },
        },
        {
          label: "c2pa.hash.data",
          data: {
            name: "input_hash",
            hash: params.input_hash,
            algorithm: "sha256",
          },
        },
        {
          label: "animaforge.consent",
          data: {
            consent_ids: params.consent_ids,
            user_id: params.user_id,
          },
        },
        {
          label: "animaforge.model",
          data: {
            model_id: params.model_id,
            output_url: params.output_url,
          },
        },
      ],
    },
    "animaforge:metadata": {
      job_id: params.job_id,
      project_id: params.project_id,
      shot_id: params.shot_id,
      model_id: params.model_id,
      input_hash: params.input_hash,
      user_id: params.user_id,
      consent_ids: params.consent_ids,
      output_url: params.output_url,
    },
  };

  return manifest;
}

export function signManifest(manifest: C2PAManifest): string {
  // Deterministic mock ECDSA P-256 signature using SHA-256 hash
  const payload = JSON.stringify(manifest);
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  return `mock-ecdsa-p256:${hash}`;
}

export function storeManifest(
  jobId: string,
  manifest: C2PAManifest,
  signature: string
): string {
  const outputId = uuidv4();
  const entry: StoredManifestEntry = {
    manifest,
    signature,
    output_id: outputId,
    created_at: manifest["c2pa:claim"].created_at,
  };
  manifestStore.set(jobId, entry);
  outputIndex.set(outputId, jobId);
  return outputId;
}

export function verifyManifest(outputId: string): VerifyResponse {
  const jobId = outputIndex.get(outputId);
  if (!jobId) {
    return {
      valid: false,
      manifest: null,
      generator: null,
      created_at: null,
      model_id: null,
    };
  }

  const entry = manifestStore.get(jobId);
  if (!entry) {
    return {
      valid: false,
      manifest: null,
      generator: null,
      created_at: null,
      model_id: null,
    };
  }

  // Re-compute signature to verify integrity
  const expectedSignature = signManifest(entry.manifest);
  const valid = entry.signature === expectedSignature;

  return {
    valid,
    manifest: entry.manifest,
    generator: entry.manifest["c2pa:claim"].claim_generator,
    created_at: entry.manifest["c2pa:claim"].created_at,
    model_id: entry.manifest["animaforge:metadata"].model_id,
  };
}

export function getManifestByJobId(
  jobId: string
): StoredManifestEntry | undefined {
  return manifestStore.get(jobId);
}

/** Clear all stored manifests (for testing) */
export function clearStore(): void {
  manifestStore.clear();
  outputIndex.clear();
}
