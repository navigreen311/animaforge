/**
 * Client for the governance provenance services.
 *
 * This file used to sign manifests itself with an ECDSA keypair generated at
 * module load, and "watermark" a video by hashing its URL. Both were
 * decorative: the keypair died with the process, and the watermark never
 * touched a pixel. Signing and watermarking now live in
 * services/governance/{c2pa,watermark}, which own the certificates and the
 * media pipeline; the browser's job is to ask them and report what they say.
 *
 * The types below deliberately keep `status` and `cryptographicallyVerified`
 * separate. "We have a record of this output" and "the signature checks out"
 * are different claims, and the UI must never collapse one into the other.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type VerificationStatus =
  /** A manifest was found in the asset and the library validated it. */
  | 'valid'
  /** A manifest was found but failed validation — treat the asset as suspect. */
  | 'invalid'
  /** The asset carries no C2PA manifest at all. */
  | 'absent'
  /** We know of this output but could not check any signature. */
  | 'unverified'
  /** No record and nothing to check. */
  | 'not_found';

/** How a provenance record came to exist. */
export type ProvenanceMode = 'c2pa-embedded' | 'unsigned-record' | 'degraded';

export interface SignatureSummary {
  algorithm: string | null;
  issuer: string | null;
  cert_serial_number: string | null;
  timestamp: string | null;
}

export interface ManifestAssertion {
  label: string;
  data: Record<string, unknown>;
}

export interface ManifestDefinition {
  claim_generator: string;
  format: string;
  title: string;
  assertions: ManifestAssertion[];
}

export interface VerificationResult {
  status: VerificationStatus;
  /** True only when the c2pa library validated an embedded manifest. */
  cryptographically_verified: boolean;
  valid: boolean;
  /** True when a provenance record exists in our database. */
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

export interface C2paCapabilities {
  service: string;
  signing: {
    available: boolean;
    library: string;
    library_available: boolean;
    library_error: string | null;
    credentials_present: boolean;
    credentials_error: string | null;
    algorithm: string;
    timestamp_authority: string;
  };
  verification: { available: boolean };
  database: { connected: boolean };
  degraded: boolean;
  degraded_reasons: string[];
}

/** What the UI shows when the service itself could not be reached. */
export interface ServiceUnavailable {
  unavailable: true;
  reason: string;
}

export type Maybe<T> = T | ServiceUnavailable;

export function isUnavailable<T>(value: Maybe<T>): value is ServiceUnavailable {
  return (value as ServiceUnavailable).unavailable === true;
}

/* ------------------------------------------------------------------ */
/*  Endpoints                                                          */
/* ------------------------------------------------------------------ */

export const C2PA_SERVICE_URL = process.env.NEXT_PUBLIC_C2PA_SERVICE_URL ?? '';
export const PIRACY_SERVICE_URL = process.env.NEXT_PUBLIC_PIRACY_SERVICE_URL ?? '';

async function getJson<T>(base: string, path: string, envVar: string): Promise<Maybe<T>> {
  if (!base) {
    return {
      unavailable: true,
      reason: `${envVar} is not configured, so live provenance data cannot be loaded.`,
    };
  }
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok && response.status !== 404) {
      return {
        unavailable: true,
        reason: `Verification service returned HTTP ${response.status}.`,
      };
    }
    return (await response.json()) as T;
  } catch (err) {
    return {
      unavailable: true,
      reason: `Could not reach the verification service: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/** Fetch the verification result for a published output id. */
export function fetchVerification(outputId: string): Promise<Maybe<VerificationResult>> {
  return getJson<VerificationResult>(
    C2PA_SERVICE_URL,
    `/governance/c2pa/verify/${encodeURIComponent(outputId)}`,
    'NEXT_PUBLIC_C2PA_SERVICE_URL',
  );
}

export function fetchC2paCapabilities(): Promise<Maybe<C2paCapabilities>> {
  return getJson<C2paCapabilities>(
    C2PA_SERVICE_URL,
    '/governance/c2pa/capabilities',
    'NEXT_PUBLIC_C2PA_SERVICE_URL',
  );
}

export interface PiracyCapabilities {
  service: string;
  fingerprinting: {
    image_fingerprinting: {
      available: boolean;
      algorithm: string;
      hash_bits: number;
    };
    video_fingerprinting: {
      available: boolean;
      algorithm: string;
      detail: string | null;
    };
    match_threshold: number;
    known_limitations: string[];
  };
  discovery: { provider: string; configured: boolean; detail: string | null };
  watermark_service: { configured: boolean; detail: string | null };
  remote_fetch: { enabled: boolean };
  database: { connected: boolean };
  degraded: boolean;
  degraded_reasons: string[];
}

export function fetchPiracyCapabilities(): Promise<Maybe<PiracyCapabilities>> {
  return getJson<PiracyCapabilities>(
    PIRACY_SERVICE_URL,
    '/piracy/capabilities',
    'NEXT_PUBLIC_PIRACY_SERVICE_URL',
  );
}

/* ------------------------------------------------------------------ */
/*  Presentation helpers                                               */
/* ------------------------------------------------------------------ */

export interface StatusPresentation {
  headline: string;
  detail: string;
  tone: 'verified' | 'warning' | 'danger' | 'neutral';
}

/**
 * Map a verification status to display copy.
 *
 * Only `valid` — which the service sets only when the c2pa library validated a
 * signature — is allowed to say "verified".
 */
export function presentStatus(result: VerificationResult): StatusPresentation {
  switch (result.status) {
    case 'valid':
      return {
        headline: 'Cryptographically verified',
        detail:
          'A C2PA manifest is embedded in this asset and its signature was validated against its certificate chain.',
        tone: 'verified',
      };
    case 'invalid':
      return {
        headline: 'Verification failed',
        detail:
          result.reason ??
          'A C2PA manifest is present but did not pass validation. The asset may have been altered since it was signed.',
        tone: 'danger',
      };
    case 'absent':
      return {
        headline: 'No provenance data',
        detail:
          'This asset carries no C2PA manifest. It may have been stripped by re-encoding or the asset may not be from AnimaForge.',
        tone: 'warning',
      };
    case 'unverified':
      return {
        headline: 'Recorded, not verified',
        detail:
          result.reason ??
          'AnimaForge holds a provenance record for this output, but no signature was checked. This is not proof of authenticity.',
        tone: 'warning',
      };
    case 'not_found':
    default:
      return {
        headline: 'Not found',
        detail: 'No AnimaForge provenance record exists for this identifier.',
        tone: 'neutral',
      };
  }
}

/** Compute an input hash for client-side display. Deterministic, key-sorted. */
export async function createInputHash(inputParams: Record<string, unknown>): Promise<string> {
  const sorted = JSON.stringify(inputParams, Object.keys(inputParams).sort());
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sorted));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
