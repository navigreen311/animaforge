/**
 * Invisible watermarking service.
 *
 * Watermarks live in the pixels. The database row is an *index* from the
 * recovered payload key back to the job that produced the asset — it is not
 * itself the evidence, which is why detection reads the media rather than
 * looking up a URL.
 */

import crypto from "crypto";
import { promises as fs } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";
import {
  DEFAULT_STRENGTH,
  MIN_DIMENSION,
  WatermarkCapacityError,
  embedIntoImage,
  extractFromImage,
} from "../lib/imageWatermark";
import { ffmpegStatus } from "../lib/ffmpeg";
import { embedIntoVideo, extractFromVideo } from "../lib/videoWatermark";
import { keyFromIdentifier, KEY_HEX_LENGTH } from "../lib/payload";
import { trustmarkStatus, trustmarkRequested } from "../lib/trustmark";

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/** Algorithm identifier written to every record. */
export const ALGORITHM = "dct-pair-v1";

/**
 * Keying material for block placement. Rotating it makes previously embedded
 * marks unreadable unless their record is still around, so every record stores
 * the seed it was written with and detection tries all known seeds.
 */
export function currentSeed(): string {
  return process.env.WATERMARK_SEED ?? "animaforge-default-watermark-seed";
}

function configuredStrength(): number {
  const raw = Number(process.env.WATERMARK_STRENGTH);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STRENGTH;
}

/** Remote fetching is opt-in: an unrestricted fetcher is an SSRF pivot. */
function remoteFetchAllowed(): boolean {
  return process.env.WATERMARK_ALLOW_REMOTE_FETCH === "true";
}

const MAX_REMOTE_BYTES = Number(
  process.env.WATERMARK_MAX_REMOTE_BYTES ?? 64 * 1024 * 1024,
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type MediaType = "image" | "video";
export type EmbedMode = "embedded" | "registered-only";

export interface WatermarkRecord {
  watermark_id: string;
  job_id: string;
  output_url: string | null;
  watermarked_url: string | null;
  watermark_data: Record<string, unknown>;
  payload_hex: string;
  algorithm: string;
  strength: number;
  seed: string;
  media_type: MediaType | null;
  mode: EmbedMode;
  source_sha256: string | null;
  marked_sha256: string | null;
  embedded_at: string;
}

export interface AssetInput {
  asset_base64?: string;
  asset_path?: string;
  asset_url?: string;
  mime_type?: string;
  /** Where to write a watermarked video. Required for video embedding. */
  output_path?: string;
}

export interface EmbedResult {
  watermark_id: string;
  watermarked_url: string | null;
  /** True only when pixels were actually altered. */
  embedded: boolean;
  mode: EmbedMode;
  algorithm: string;
  media_type: MediaType | null;
  /** Base64 of the marked asset, for inline image requests only. */
  asset_base64?: string;
  output_path?: string;
  /** Peak signal-to-noise ratio vs the source, dB. Images only. */
  psnr?: number;
  frames_processed?: number;
  warning?: string;
}

export interface DetectionResult {
  /** True only when a payload was recovered from the media and its CRC checked out. */
  detected: boolean;
  watermark_id: string | null;
  /** How the answer was reached — never "we found the URL in our database". */
  method:
    | "pixel-extraction"
    | "video-frame-extraction"
    | "no-asset-supplied"
    | "unsupported-media"
    | "extraction-failed";
  /**
   * Signal agreement in [0,1] from the majority vote. Reported for
   * transparency; the CRC, not this number, decides `detected`.
   */
  confidence: number;
  payload_hex: string | null;
  /** Present only when the recovered key matches a known record. */
  metadata: Record<string, unknown> | null;
  /** True when a payload was recovered but no record matches it. */
  unregistered: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/*  Stores                                                             */
/* ------------------------------------------------------------------ */

const watermarkStore = new Map<string, WatermarkRecord>();
const payloadIndex = new Map<string, string>();

function remember(record: WatermarkRecord): void {
  watermarkStore.set(record.watermark_id, record);
  payloadIndex.set(record.payload_hex, record.watermark_id);
}

export function clearStore(): void {
  watermarkStore.clear();
  payloadIndex.clear();
}

async function persist(record: WatermarkRecord): Promise<void> {
  try {
    if (!isPrismaAvailable()) {
      remember(record);
      return;
    }
    await prisma!.watermark.create({
      data: {
        watermarkId: record.watermark_id,
        jobId: record.job_id,
        outputId: (record.watermark_data.output_id as string) ?? null,
        userId: (record.watermark_data.user_id as string) ?? null,
        payloadHex: record.payload_hex,
        algorithm: record.algorithm,
        strength: record.strength,
        seed: record.seed,
        mediaType: record.media_type ?? "unknown",
        mode: record.mode,
        sourceSha256: record.source_sha256,
        markedSha256: record.marked_sha256,
        outputUrl: record.output_url,
        metadata: record.watermark_data as object,
        embeddedAt: new Date(record.embedded_at),
      },
    });
  } catch {
    // The in-memory index keeps the service usable without a database.
    remember(record);
  }
}

async function lookupByPayload(
  payloadHex: string,
): Promise<WatermarkRecord | null> {
  try {
    if (isPrismaAvailable()) {
      const row = await prisma!.watermark.findFirst({
        where: { payloadHex },
        orderBy: { embeddedAt: "desc" },
      });
      if (row) {
        return {
          watermark_id: row.watermarkId,
          job_id: row.jobId,
          output_url: row.outputUrl,
          watermarked_url: row.outputUrl,
          watermark_data: (row.metadata as Record<string, unknown>) ?? {},
          payload_hex: row.payloadHex,
          algorithm: row.algorithm,
          strength: row.strength,
          seed: row.seed,
          media_type: (row.mediaType as MediaType) ?? null,
          mode: row.mode as EmbedMode,
          source_sha256: row.sourceSha256,
          marked_sha256: row.markedSha256,
          embedded_at: row.embeddedAt.toISOString(),
        };
      }
    }
  } catch {
    // fall through to the in-memory index
  }
  const id = payloadIndex.get(payloadHex);
  return id ? (watermarkStore.get(id) ?? null) : null;
}

/** Every distinct seed we might need to try when reading an unknown asset. */
async function knownSeeds(): Promise<string[]> {
  const seeds = new Set<string>([currentSeed()]);
  for (const record of watermarkStore.values()) seeds.add(record.seed);
  try {
    if (isPrismaAvailable()) {
      const rows = await prisma!.watermark.findMany({
        distinct: ["seed"],
        select: { seed: true },
        take: 16,
      });
      for (const row of rows) seeds.add(row.seed);
    }
  } catch {
    // in-memory seeds only
  }
  return [...seeds];
}

/* ------------------------------------------------------------------ */
/*  Asset loading                                                      */
/* ------------------------------------------------------------------ */

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function mediaTypeOf(mimeType: string | undefined): MediaType | null {
  if (!mimeType) return null;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

async function fetchRemote(url: string): Promise<Buffer> {
  if (!remoteFetchAllowed()) {
    throw new Error(
      "remote asset fetching is disabled (set WATERMARK_ALLOW_REMOTE_FETCH=true to enable)",
    );
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`unsupported protocol ${parsed.protocol}`);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`fetch returned HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_REMOTE_BYTES) {
    throw new Error(`asset exceeds ${MAX_REMOTE_BYTES} byte limit`);
  }
  return buffer;
}

interface LoadedAsset {
  buffer: Buffer | null;
  path: string | null;
  mimeType: string | undefined;
  mediaType: MediaType | null;
}

async function loadAsset(input: AssetInput): Promise<LoadedAsset | null> {
  if (input.asset_base64) {
    const buffer = Buffer.from(input.asset_base64, "base64");
    return {
      buffer,
      path: null,
      mimeType: input.mime_type,
      mediaType: mediaTypeOf(input.mime_type) ?? "image",
    };
  }
  if (input.asset_path) {
    const mediaType =
      mediaTypeOf(input.mime_type) ?? guessFromPath(input.asset_path);
    if (mediaType === "video") {
      return {
        buffer: null,
        path: input.asset_path,
        mimeType: input.mime_type,
        mediaType,
      };
    }
    return {
      buffer: await fs.readFile(input.asset_path),
      path: input.asset_path,
      mimeType: input.mime_type,
      mediaType,
    };
  }
  if (input.asset_url) {
    const buffer = await fetchRemote(input.asset_url);
    return {
      buffer,
      path: null,
      mimeType: input.mime_type,
      mediaType: mediaTypeOf(input.mime_type) ?? guessFromPath(input.asset_url),
    };
  }
  return null;
}

function guessFromPath(p: string): MediaType | null {
  const ext = p.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (
    ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"].includes(ext)
  ) {
    return "image";
  }
  if (["mp4", "mov", "mkv", "webm", "avi", "m4v"].includes(ext)) return "video";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Embedding                                                          */
/* ------------------------------------------------------------------ */

export async function embedWatermark(
  job_id: string,
  output_url: string | null,
  watermark_data: Record<string, unknown> = {},
  asset: AssetInput = {},
): Promise<EmbedResult> {
  const watermark_id = uuidv4();
  const payload_hex = keyFromIdentifier(watermark_id.replace(/-/g, ""));
  const seed = currentSeed();
  const strength = configuredStrength();
  const watermarked_url = output_url
    ? `${output_url}?wm=${watermark_id}`
    : null;

  const loaded = await loadAsset(asset);

  // No media supplied: record the intent, but say plainly that no pixels moved.
  if (!loaded) {
    const record: WatermarkRecord = {
      watermark_id,
      job_id,
      output_url,
      watermarked_url,
      watermark_data,
      payload_hex,
      algorithm: ALGORITHM,
      strength,
      seed,
      media_type: null,
      mode: "registered-only",
      source_sha256: null,
      marked_sha256: null,
      embedded_at: new Date().toISOString(),
    };
    await persist(record);
    return {
      watermark_id,
      watermarked_url,
      embedded: false,
      mode: "registered-only",
      algorithm: ALGORITHM,
      media_type: null,
      warning:
        "No asset bytes were supplied, so no watermark was embedded. This record " +
        "is a registration only and is NOT detectable in the media. Supply " +
        "asset_base64, asset_path or asset_url to embed a real watermark.",
    };
  }

  if (loaded.mediaType === "video") {
    if (!loaded.path) {
      throw new Error(
        "video watermarking requires asset_path (streaming from disk)",
      );
    }
    if (!asset.output_path) {
      throw new Error("video watermarking requires output_path");
    }
    const { framesProcessed, info } = await embedIntoVideo(
      loaded.path,
      asset.output_path,
      payload_hex,
      seed,
      { strength },
    );
    const markedBytes = await fs.readFile(asset.output_path);
    const record: WatermarkRecord = {
      watermark_id,
      job_id,
      output_url,
      watermarked_url,
      watermark_data: {
        ...watermark_data,
        width: info.width,
        height: info.height,
      },
      payload_hex,
      algorithm: ALGORITHM,
      strength,
      seed,
      media_type: "video",
      mode: "embedded",
      source_sha256: sha256(await fs.readFile(loaded.path)),
      marked_sha256: sha256(markedBytes),
      embedded_at: new Date().toISOString(),
    };
    await persist(record);
    return {
      watermark_id,
      watermarked_url,
      embedded: true,
      mode: "embedded",
      algorithm: ALGORITHM,
      media_type: "video",
      output_path: asset.output_path,
      frames_processed: framesProcessed,
    };
  }

  if (loaded.mediaType !== "image" || !loaded.buffer) {
    throw new Error(
      `unsupported media type "${loaded.mimeType ?? "unknown"}" — only image/* and video/* can be watermarked`,
    );
  }

  const outputMimeType =
    asset.mime_type === "image/jpeg" ? "image/jpeg" : "image/png";
  const result = await embedIntoImage(loaded.buffer, payload_hex, seed, {
    strength,
    outputMimeType,
  });

  const record: WatermarkRecord = {
    watermark_id,
    job_id,
    output_url,
    watermarked_url,
    watermark_data: {
      ...watermark_data,
      width: result.width,
      height: result.height,
      psnr_db: result.psnr,
    },
    payload_hex,
    algorithm: ALGORITHM,
    strength,
    seed,
    media_type: "image",
    mode: "embedded",
    source_sha256: sha256(loaded.buffer),
    marked_sha256: sha256(result.buffer),
    embedded_at: new Date().toISOString(),
  };
  await persist(record);

  const embedResult: EmbedResult = {
    watermark_id,
    watermarked_url,
    embedded: true,
    mode: "embedded",
    algorithm: ALGORITHM,
    media_type: "image",
    psnr: result.psnr,
  };
  if (asset.output_path) {
    await fs.writeFile(asset.output_path, result.buffer);
    embedResult.output_path = asset.output_path;
  } else {
    embedResult.asset_base64 = result.buffer.toString("base64");
  }
  return embedResult;
}

/* ------------------------------------------------------------------ */
/*  Detection                                                          */
/* ------------------------------------------------------------------ */

const NOT_DETECTED: Omit<DetectionResult, "method" | "reason"> = {
  detected: false,
  watermark_id: null,
  confidence: 0,
  payload_hex: null,
  metadata: null,
  unregistered: false,
};

export async function detectWatermark(
  asset: AssetInput,
): Promise<DetectionResult> {
  let loaded: LoadedAsset | null;
  try {
    loaded = await loadAsset(asset);
  } catch (err) {
    return {
      ...NOT_DETECTED,
      method: "extraction-failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  if (!loaded) {
    return {
      ...NOT_DETECTED,
      method: "no-asset-supplied",
      reason:
        "Watermark detection requires the media itself. A URL alone proves nothing: " +
        "supply asset_base64, asset_path, or asset_url (with WATERMARK_ALLOW_REMOTE_FETCH=true).",
    };
  }

  const seeds = await knownSeeds();

  try {
    if (loaded.mediaType === "video") {
      if (!loaded.path) {
        return {
          ...NOT_DETECTED,
          method: "unsupported-media",
          reason: "video detection requires asset_path",
        };
      }
      for (const seed of seeds) {
        const found = await extractFromVideo(loaded.path, seed);
        if (found.valid) {
          return await resolveMatch(
            found.keyHex,
            found.agreement,
            "video-frame-extraction",
            {
              frames_sampled: found.framesSampled,
              frames_recovered: found.framesRecovered,
            },
          );
        }
      }
      return { ...NOT_DETECTED, method: "video-frame-extraction" };
    }

    if (loaded.mediaType !== "image" || !loaded.buffer) {
      return {
        ...NOT_DETECTED,
        method: "unsupported-media",
        reason: `cannot extract from media type "${loaded.mimeType ?? "unknown"}"`,
      };
    }

    let bestAgreement = 0;
    for (const seed of seeds) {
      const found = await extractFromImage(loaded.buffer, seed);
      bestAgreement = Math.max(bestAgreement, found.agreement);
      if (found.valid) {
        return await resolveMatch(
          found.keyHex,
          found.agreement,
          "pixel-extraction",
          {},
        );
      }
    }
    return {
      ...NOT_DETECTED,
      method: "pixel-extraction",
      confidence: bestAgreement,
    };
  } catch (err) {
    if (err instanceof WatermarkCapacityError) {
      return {
        ...NOT_DETECTED,
        method: "unsupported-media",
        reason: `${err.message} (minimum ${MIN_DIMENSION}x${MIN_DIMENSION})`,
      };
    }
    return {
      ...NOT_DETECTED,
      method: "extraction-failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function resolveMatch(
  payloadHex: string,
  agreement: number,
  method: DetectionResult["method"],
  extra: Record<string, unknown>,
): Promise<DetectionResult> {
  const record = await lookupByPayload(payloadHex);
  if (!record) {
    // A valid payload we have no record of is still a real finding — say so,
    // rather than reporting "not detected".
    return {
      detected: true,
      watermark_id: null,
      method,
      confidence: agreement,
      payload_hex: payloadHex,
      metadata: null,
      unregistered: true,
      reason: "payload recovered but no matching watermark record was found",
    };
  }
  return {
    detected: true,
    watermark_id: record.watermark_id,
    method,
    confidence: agreement,
    payload_hex: payloadHex,
    metadata: {
      job_id: record.job_id,
      embedded_at: record.embedded_at,
      watermark_data: record.watermark_data,
      algorithm: record.algorithm,
      media_type: record.media_type,
      ...extra,
    },
    unregistered: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Capabilities                                                       */
/* ------------------------------------------------------------------ */

export interface WatermarkCapabilities {
  service: string;
  engine: string;
  image_watermarking: {
    available: true;
    algorithm: string;
    minimum_dimension: number;
  };
  video_watermarking: {
    available: boolean;
    requires: string;
    detail: string | null;
  };
  trustmark: {
    requested: boolean;
    available: boolean;
    version: string | null;
    detail: string | null;
  };
  remote_fetch: { enabled: boolean };
  database: { connected: boolean };
  degraded: boolean;
  degraded_reasons: string[];
}

export async function getCapabilities(): Promise<WatermarkCapabilities> {
  const ffmpeg = await ffmpegStatus();
  const tm = await trustmarkStatus();
  const reasons: string[] = [];

  if (!ffmpeg.available) {
    reasons.push("ffmpeg not found — video watermarking is unavailable");
  }
  if (tm.requested && !tm.available) {
    reasons.push(
      `WATERMARK_ENGINE=trustmark but TrustMark is not importable (${tm.error ?? "unknown error"}); using ${ALGORITHM}`,
    );
  }
  if (!isPrismaAvailable()) {
    reasons.push(
      "no database connection — watermark records are in-memory only",
    );
  }

  return {
    service: "watermark",
    engine: tm.available ? "trustmark" : ALGORITHM,
    image_watermarking: {
      available: true,
      algorithm: ALGORITHM,
      minimum_dimension: MIN_DIMENSION,
    },
    video_watermarking: {
      available: ffmpeg.available,
      requires: "ffmpeg + ffprobe on PATH (or FFMPEG_PATH / FFPROBE_PATH)",
      detail: ffmpeg.available ? ffmpeg.version : ffmpeg.error,
    },
    trustmark: {
      requested: trustmarkRequested(),
      available: tm.available,
      version: tm.version,
      detail: tm.error,
    },
    remote_fetch: { enabled: remoteFetchAllowed() },
    database: { connected: isPrismaAvailable() },
    degraded: reasons.length > 0,
    degraded_reasons: reasons,
  };
}

export const PAYLOAD_KEY_HEX_LENGTH = KEY_HEX_LENGTH;
