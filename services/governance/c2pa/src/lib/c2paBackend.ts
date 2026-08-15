/**
 * c2pa-node adapter.
 *
 * ## Why c2pa-node and not c2patool
 *
 * Both were considered. `c2patool` is a standalone Rust binary that would have
 * to be downloaded, version-pinned and placed on PATH by whoever deploys the
 * service — an extra out-of-band provisioning step, and one that fails on a
 * developer laptop in a way npm cannot diagnose. `c2pa-node` ships prebuilt
 * native bindings for x86_64/aarch64 Linux, macOS and x86_64 Windows and
 * fetches them from the package's GitHub release during `npm install`, so a
 * plain `npm ci` produces a working signer on every platform this repo targets
 * — no Rust toolchain, no separate binary to ship. It is also the same
 * c2pa-rs core, so the manifests are byte-for-byte the same standard.
 *
 * The tradeoff is that `npm ci --ignore-scripts` will NOT get the binding, and
 * the install needs network access to GitHub. Both are recorded in
 * docs/governance-pipeline.md and both are reported honestly by
 * `backendStatus()` rather than being assumed.
 *
 * ## Timestamping is mandatory
 *
 * c2pa-node 0.5.x requires a `tsaUrl` on the signer: omitting it makes the
 * native binding throw. Signing therefore requires reachable RFC 3161
 * timestamp authority. `C2PA_TSA_URL` selects it.
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

/* ------------------------------------------------------------------ */
/*  Lazy library load                                                  */
/* ------------------------------------------------------------------ */

interface C2paModule {
  createC2pa: (options?: Record<string, unknown>) => {
    sign: (props: Record<string, unknown>) => Promise<{
      signedAsset: { buffer?: Buffer; path?: string; mimeType?: string };
    }>;
    read: (asset: Record<string, unknown>) => Promise<ResolvedStore | null>;
  };
  ManifestBuilder: new (
    definition: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  SigningAlgorithm: Record<string, string>;
}

export interface ResolvedSignatureInfo {
  alg?: string;
  issuer?: string;
  cert_serial_number?: string;
  time?: string | null;
}

export interface ResolvedManifest {
  label?: string;
  claim_generator?: string;
  title?: string;
  format?: string;
  signature_info?: ResolvedSignatureInfo | null;
  assertions?: Array<{ label: string; data?: unknown }>;
  [key: string]: unknown;
}

export interface ResolvedStore {
  active_manifest: ResolvedManifest | null;
  manifests: Record<string, ResolvedManifest>;
  validation_status: Array<{
    code?: string;
    explanation?: string;
    url?: string;
  }>;
}

let libModule: C2paModule | null = null;
let libError: string | null = null;
let libLoaded = false;

function loadLibrary(): C2paModule | null {
  if (libLoaded) return libModule;
  libLoaded = true;
  try {
    // Required lazily so a missing native binding degrades the service instead
    // of preventing it from booting at all.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    libModule = require('c2pa-node') as C2paModule;
    libError = null;
  } catch (err) {
    libModule = null;
    libError = err instanceof Error ? err.message : String(err);
  }
  return libModule;
}

/** Reset the memoised library/credential probes (tests). */
export function resetBackend(): void {
  libLoaded = false;
  libModule = null;
  libError = null;
}

/* ------------------------------------------------------------------ */
/*  Credentials                                                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_TSA_URL = 'http://timestamp.digicert.com';

function tsaUrl(): string {
  return process.env.C2PA_TSA_URL ?? DEFAULT_TSA_URL;
}

/**
 * Read a PEM from an env var that holds either the PEM itself or a path to it.
 * Inline PEMs suit Kubernetes secrets; paths suit mounted volumes.
 */
async function readPem(value: string | undefined): Promise<Buffer | null> {
  if (!value) return null;
  if (value.includes('-----BEGIN')) return Buffer.from(value, 'utf8');
  try {
    return await fs.readFile(value);
  } catch {
    return null;
  }
}

export interface Credentials {
  certificate: Buffer;
  privateKey: Buffer;
  algorithm: string;
  tsaUrl: string;
}

export interface BackendStatus {
  /** The c2pa-node native binding loaded. */
  libraryAvailable: boolean;
  libraryError: string | null;
  /** Both C2PA_SIGNING_CERT and C2PA_PRIVATE_KEY resolved to readable PEMs. */
  credentialsPresent: boolean;
  credentialsError: string | null;
  tsaUrl: string;
  algorithm: string;
  /** True when this process can produce a real, COSE-signed manifest. */
  canSign: boolean;
  /** True when this process can cryptographically verify a manifest. */
  canVerify: boolean;
  degradedReasons: string[];
}

async function resolveCredentials(): Promise<{
  credentials: Credentials | null;
  error: string | null;
}> {
  const certRaw = process.env.C2PA_SIGNING_CERT;
  const keyRaw = process.env.C2PA_PRIVATE_KEY;
  if (!certRaw && !keyRaw) {
    return { credentials: null, error: null };
  }
  if (!certRaw || !keyRaw) {
    return {
      credentials: null,
      error: 'C2PA_SIGNING_CERT and C2PA_PRIVATE_KEY must both be set; only one is present',
    };
  }
  const certificate = await readPem(certRaw);
  const privateKey = await readPem(keyRaw);
  if (!certificate) {
    return { credentials: null, error: 'C2PA_SIGNING_CERT could not be read' };
  }
  if (!privateKey) {
    return { credentials: null, error: 'C2PA_PRIVATE_KEY could not be read' };
  }
  return {
    credentials: {
      certificate,
      privateKey,
      algorithm: (process.env.C2PA_SIGNING_ALGORITHM ?? 'es256').toLowerCase(),
      tsaUrl: tsaUrl(),
    },
    error: null,
  };
}

export async function backendStatus(): Promise<BackendStatus> {
  const lib = loadLibrary();
  const { credentials, error } = await resolveCredentials();
  const reasons: string[] = [];

  if (!lib) {
    reasons.push(
      `c2pa-node native binding unavailable (${libError ?? 'unknown error'}) — ` +
        'manifests cannot be signed, embedded or cryptographically verified',
    );
  }
  if (!credentials) {
    reasons.push(
      error ??
        'no signing credentials: set C2PA_SIGNING_CERT and C2PA_PRIVATE_KEY to enable real signing',
    );
  }

  return {
    libraryAvailable: lib !== null,
    libraryError: libError,
    credentialsPresent: credentials !== null,
    credentialsError: error,
    tsaUrl: tsaUrl(),
    algorithm: credentials?.algorithm ?? 'es256',
    canSign: lib !== null && credentials !== null,
    canVerify: lib !== null,
    degradedReasons: reasons,
  };
}

/* ------------------------------------------------------------------ */
/*  Signing                                                            */
/* ------------------------------------------------------------------ */

/** Buffer signing is limited to these types by c2pa-node; others need a path. */
const BUFFER_SIGNABLE = new Set(['image/jpeg', 'image/png']);

export interface SignAssetInput {
  buffer?: Buffer;
  path?: string;
  mimeType: string;
  /** Destination for file-based signing. Ignored for buffer signing. */
  outputPath?: string;
}

export interface SignAssetResult {
  /** Signed bytes, for buffer-based signing. */
  buffer: Buffer | null;
  /** Signed file location, for path-based signing. */
  path: string | null;
  store: ResolvedStore | null;
  manifestLabel: string | null;
  signatureInfo: ResolvedSignatureInfo | null;
}

export class C2paUnavailableError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`C2PA signing is unavailable: ${reasons.join('; ')}`);
    this.name = 'C2paUnavailableError';
    this.reasons = reasons;
  }
}

/**
 * Sign an asset and embed the manifest into the asset bytes.
 *
 * Embedding — rather than storing the manifest alongside — is the point: the
 * provenance travels with the file when it is downloaded, re-uploaded or
 * handed to a third party.
 */
export async function signAndEmbed(
  asset: SignAssetInput,
  manifestDefinition: Record<string, unknown>,
): Promise<SignAssetResult> {
  const lib = loadLibrary();
  const { credentials, error } = await resolveCredentials();
  if (!lib || !credentials) {
    const reasons: string[] = [];
    if (!lib) reasons.push(libError ?? 'c2pa-node unavailable');
    if (!credentials) reasons.push(error ?? 'signing credentials not configured');
    throw new C2paUnavailableError(reasons);
  }

  const { createC2pa, ManifestBuilder, SigningAlgorithm } = lib;
  const algorithm =
    Object.values(SigningAlgorithm).find((a) => a === credentials.algorithm) ?? 'es256';

  const c2pa = createC2pa({
    signer: {
      type: 'local',
      certificate: credentials.certificate,
      privateKey: credentials.privateKey,
      algorithm,
      // Mandatory in c2pa-node 0.5.x — see the module header.
      tsaUrl: credentials.tsaUrl,
    },
  });

  const builder = new ManifestBuilder(manifestDefinition, {
    vendor: 'animaforge',
  });

  const useBuffer = asset.buffer !== undefined && BUFFER_SIGNABLE.has(asset.mimeType);
  if (!useBuffer && !asset.path) {
    throw new Error(
      `signing ${asset.mimeType} requires asset_path — only ${[...BUFFER_SIGNABLE].join(', ')} can be signed from memory`,
    );
  }

  if (useBuffer) {
    const { signedAsset } = await c2pa.sign({
      asset: { buffer: asset.buffer, mimeType: asset.mimeType },
      manifest: builder,
    });
    const signedBuffer = signedAsset.buffer ?? null;
    const store = signedBuffer
      ? await c2pa.read({ buffer: signedBuffer, mimeType: asset.mimeType })
      : null;
    return {
      buffer: signedBuffer,
      path: null,
      store,
      manifestLabel: store?.active_manifest?.label ?? null,
      signatureInfo: store?.active_manifest?.signature_info ?? null,
    };
  }

  const { signedAsset } = await c2pa.sign({
    asset: { path: asset.path as string, mimeType: asset.mimeType },
    manifest: builder,
    options: { embed: true, outputPath: asset.outputPath ?? asset.path },
  });
  const signedPath = signedAsset.path ?? asset.outputPath ?? asset.path ?? null;
  const store = signedPath ? await c2pa.read({ path: signedPath, mimeType: asset.mimeType }) : null;
  return {
    buffer: null,
    path: signedPath,
    store,
    manifestLabel: store?.active_manifest?.label ?? null,
    signatureInfo: store?.active_manifest?.signature_info ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Verification                                                       */
/* ------------------------------------------------------------------ */

export type VerificationStatus = 'valid' | 'invalid' | 'absent' | 'unverified';

export interface VerificationResult {
  status: VerificationStatus;
  /**
   * True ONLY when c2pa-node parsed an embedded manifest and reported no
   * validation errors. Never inferred from the presence of a database row.
   */
  cryptographicallyVerified: boolean;
  store: ResolvedStore | null;
  validationStatus: Array<{
    code?: string;
    explanation?: string;
    url?: string;
  }>;
  manifestLabel: string | null;
  signatureInfo: ResolvedSignatureInfo | null;
  reason: string | null;
}

const UNVERIFIED = (reason: string): VerificationResult => ({
  status: 'unverified',
  cryptographicallyVerified: false,
  store: null,
  validationStatus: [],
  manifestLabel: null,
  signatureInfo: null,
  reason,
});

/** Read and cryptographically validate whatever manifest is embedded in an asset. */
export async function verifyAsset(asset: {
  buffer?: Buffer;
  path?: string;
  mimeType: string;
}): Promise<VerificationResult> {
  const lib = loadLibrary();
  if (!lib) {
    return UNVERIFIED(
      `c2pa-node native binding unavailable (${libError ?? 'unknown error'}); ` +
        'the manifest could not be checked',
    );
  }

  const c2pa = lib.createC2pa();
  let store: ResolvedStore | null;
  try {
    store = asset.buffer
      ? await c2pa.read({ buffer: asset.buffer, mimeType: asset.mimeType })
      : await c2pa.read({
          path: asset.path as string,
          mimeType: asset.mimeType,
        });
  } catch (err) {
    return {
      status: 'invalid',
      cryptographicallyVerified: false,
      store: null,
      validationStatus: [],
      manifestLabel: null,
      signatureInfo: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  if (!store || !store.active_manifest) {
    return {
      status: 'absent',
      cryptographicallyVerified: false,
      store,
      validationStatus: store?.validation_status ?? [],
      manifestLabel: null,
      signatureInfo: null,
      reason: 'no C2PA manifest is embedded in this asset',
    };
  }

  const failures = (store.validation_status ?? []).filter(
    (s) => typeof s.code === 'string' && !s.code.endsWith('.informational'),
  );

  if (failures.length > 0) {
    return {
      status: 'invalid',
      cryptographicallyVerified: false,
      store,
      validationStatus: store.validation_status ?? [],
      manifestLabel: store.active_manifest.label ?? null,
      signatureInfo: store.active_manifest.signature_info ?? null,
      reason: failures
        .map((f) => f.explanation ?? f.code)
        .filter(Boolean)
        .join('; '),
    };
  }

  return {
    status: 'valid',
    cryptographicallyVerified: true,
    store,
    validationStatus: store.validation_status ?? [],
    manifestLabel: store.active_manifest.label ?? null,
    signatureInfo: store.active_manifest.signature_info ?? null,
    reason: null,
  };
}

/** SHA-256 of asset bytes — binds a stored record to the exact file it describes. */
export function assetDigest(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
