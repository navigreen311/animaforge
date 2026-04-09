import { createHash, createSign, createVerify, generateKeyPairSync } from 'crypto';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface C2PAAction {
  action: string;
  softwareAgent?: string;
  when?: string;
  parameters?: Record<string, unknown>;
}

export interface C2PAMetadata {
  inputHash: string;
  modelId: string;
  userId: string;
  tier: string;
  [key: string]: unknown;
}

export interface C2PAManifest {
  title: string;
  generator: string;
  created: string;
  actions: C2PAAction[];
  metadata: C2PAMetadata;
  signature?: string;
  watermarkId?: string;
}

export interface SignOutputParams {
  title: string;
  outputId: string;
  modelId: string;
  userId: string;
  tier: string;
  inputParams: Record<string, unknown>;
  actions?: C2PAAction[];
}

export interface SignOutputResult {
  manifestJson: string;
  watermarkId: string;
}

/* ------------------------------------------------------------------ */
/*  Signing key pair (ECDSA P-256)                                     */
/* ------------------------------------------------------------------ */

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

/* ------------------------------------------------------------------ */
/*  Hash utilities                                                     */
/* ------------------------------------------------------------------ */

/**
 * Create a SHA-256 hash of arbitrary input parameters.
 * Deterministic — keys are sorted before hashing.
 */
export function createInputHash(inputParams: Record<string, unknown>): string {
  const sorted = JSON.stringify(inputParams, Object.keys(inputParams).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

/**
 * One-way hash of a user ID for privacy-preserving provenance records.
 */
export function hashUserId(userId: string): string {
  return createHash('sha256').update(`animaforge:user:${userId}`).digest('hex');
}

/* ------------------------------------------------------------------ */
/*  Signing & verification                                             */
/* ------------------------------------------------------------------ */

/**
 * Build a C2PA manifest, sign it with ECDSA P-256, and return the
 * serialised manifest JSON together with a watermark ID.
 */
export function signOutput(params: SignOutputParams): SignOutputResult {
  const {
    title,
    outputId,
    modelId,
    userId,
    tier,
    inputParams,
    actions = [],
  } = params;

  const manifest: C2PAManifest = {
    title,
    generator: 'AnimaForge/1.0',
    created: new Date().toISOString(),
    actions: [
      {
        action: 'c2pa.created',
        softwareAgent: 'AnimaForge/1.0',
        when: new Date().toISOString(),
      },
      ...actions,
    ],
    metadata: {
      inputHash: createInputHash(inputParams),
      modelId,
      userId: hashUserId(userId),
      tier,
    },
  };

  // Sign the canonical JSON representation
  const manifestPayload = JSON.stringify(manifest);
  const signer = createSign('SHA256');
  signer.update(manifestPayload);
  signer.end();
  const signature = signer.sign(privateKey, 'base64');

  manifest.signature = signature;
  manifest.watermarkId = applyWatermark(outputId, outputId);

  return {
    manifestJson: JSON.stringify(manifest),
    watermarkId: manifest.watermarkId,
  };
}

/**
 * Verify a C2PA manifest signature. The `manifestJson` must be the
 * manifest **without** the `signature` and `watermarkId` fields (i.e.
 * the payload that was originally signed).
 */
export function verifyManifest(manifestJson: string, signature: string): boolean {
  const verifier = createVerify('SHA256');
  verifier.update(manifestJson);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
}

/* ------------------------------------------------------------------ */
/*  Watermarking (placeholder)                                         */
/* ------------------------------------------------------------------ */

/**
 * Apply an imperceptible watermark to a video output.
 *
 * TODO: Integrate a real watermarking library (e.g. C2PA-based steganography).
 * For now returns a deterministic watermark ID derived from the output ID.
 */
export function applyWatermark(videoUrl: string, outputId: string): string {
  return createHash('sha256')
    .update(`animaforge:watermark:${outputId}:${videoUrl}`)
    .digest('hex')
    .slice(0, 16);
}
