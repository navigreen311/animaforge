/**
 * X4 fingerprinting — register protected outputs and find near-duplicates.
 *
 * Matching is a Hamming-distance search over perceptual hashes, not an
 * equality lookup on a content hash, so a re-encoded or rescaled copy still
 * matches. Every result carries the distance it was matched at, because a
 * match at distance 3 and a match at distance 12 are not the same claim.
 */

import crypto from 'crypto';
import { promises as fs } from 'node:fs';
import { prisma, isPrismaAvailable } from '../db';
import { ffmpegStatus, sampleFrames } from '../lib/ffmpeg';
import {
  HASH_BITS,
  hammingDistance,
  hashFrame,
  hashImageBuffer,
  sequenceDistance,
  similarityFromDistance,
} from '../lib/perceptualHash';

export const IMAGE_ALGORITHM = 'phash-dct64';
export const VIDEO_ALGORITHM = 'phash-dct64-seq';

/** Frames sampled per video. More frames cost decode time and buy resilience
 *  against a pirate re-cutting the timeline. */
export const VIDEO_FRAME_SAMPLES = Number(process.env.FINGERPRINT_VIDEO_SAMPLES ?? 9);

/**
 * Maximum Hamming distance (out of 64 bits) still treated as a match.
 *
 * 10 is the conventional pHash threshold. Measured on this implementation:
 * JPEG q15 re-encode lands at ~2, a 50% rescale at 0, a 5% border crop at ~14.
 * Crops and rotations are therefore NOT reliably caught — that is a real limit
 * of a global perceptual hash, documented rather than hidden.
 */
export const MATCH_THRESHOLD = Number(process.env.FINGERPRINT_MATCH_THRESHOLD ?? 10);

export type MediaType = 'image' | 'video';
export type MatchConfidence = 'high' | 'medium' | 'low';

export interface FingerprintRecord {
  id: string;
  outputId: string;
  userId: string | null;
  mediaType: MediaType;
  algorithm: string;
  phash: string;
  ahash: string | null;
  dhash: string | null;
  frameHashes: string[];
  durationMs: number | null;
  width: number | null;
  height: number | null;
  sourceSha256: string | null;
  createdAt: string;
}

export interface FingerprintMatch {
  fingerprint: FingerprintRecord;
  distance: number;
  similarity: number;
  confidence: MatchConfidence;
  algorithm: string;
  /** Secondary hashes, reported so a reviewer can sanity-check a borderline hit. */
  distances: { phash: number; ahash: number | null; dhash: number | null };
}

export interface AssetInput {
  asset_base64?: string;
  asset_path?: string;
  mime_type?: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

const fingerprints = new Map<string, FingerprintRecord>();

export function clearFingerprints(): void {
  fingerprints.clear();
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/* ------------------------------------------------------------------ */
/*  Computation                                                        */
/* ------------------------------------------------------------------ */

export interface ComputedFingerprint {
  mediaType: MediaType;
  algorithm: string;
  phash: string;
  ahash: string | null;
  dhash: string | null;
  frameHashes: string[];
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sourceSha256: string | null;
}

export class UnsupportedMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMediaError';
  }
}

function mediaTypeOf(input: AssetInput): MediaType {
  if (input.mime_type?.startsWith('video/')) return 'video';
  if (input.mime_type?.startsWith('image/')) return 'image';
  const ext = input.asset_path?.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'].includes(ext)) return 'video';
  return 'image';
}

/** Compute a fingerprint from supplied media. Throws if the media cannot be read. */
export async function computeFingerprint(input: AssetInput): Promise<ComputedFingerprint> {
  const mediaType = mediaTypeOf(input);

  if (mediaType === 'video') {
    if (!input.asset_path) {
      throw new UnsupportedMediaError(
        'video fingerprinting requires asset_path (frames are streamed from disk)',
      );
    }
    const status = await ffmpegStatus();
    if (!status.available) {
      throw new UnsupportedMediaError(
        `video fingerprinting requires ffmpeg, which is not available (${status.error ?? 'not found'})`,
      );
    }
    const { info, frames } = await sampleFrames(input.asset_path, VIDEO_FRAME_SAMPLES);
    if (frames.length === 0) {
      throw new UnsupportedMediaError('no frames could be decoded from the video');
    }
    const hashes = frames.map((f) => hashFrame(f));
    return {
      mediaType,
      algorithm: VIDEO_ALGORITHM,
      // The middle frame stands in as the single representative hash for
      // indexing; the full sequence is what actual comparison uses.
      phash: hashes[Math.floor(hashes.length / 2)].phash,
      ahash: hashes[Math.floor(hashes.length / 2)].ahash,
      dhash: hashes[Math.floor(hashes.length / 2)].dhash,
      frameHashes: hashes.map((h) => h.phash),
      width: info.width,
      height: info.height,
      durationMs: Math.round(info.durationSeconds * 1000),
      sourceSha256: sha256(await fs.readFile(input.asset_path)),
    };
  }

  const buffer = input.asset_base64
    ? Buffer.from(input.asset_base64, 'base64')
    : input.asset_path
      ? await fs.readFile(input.asset_path)
      : null;
  if (!buffer) {
    throw new UnsupportedMediaError('fingerprinting requires asset_base64 or asset_path');
  }
  const hashes = await hashImageBuffer(buffer);
  return {
    mediaType: 'image',
    algorithm: IMAGE_ALGORITHM,
    phash: hashes.phash,
    ahash: hashes.ahash,
    dhash: hashes.dhash,
    frameHashes: [],
    width: hashes.width,
    height: hashes.height,
    durationMs: null,
    sourceSha256: sha256(buffer),
  };
}

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */

export async function registerFingerprint(
  outputId: string,
  input: AssetInput,
  userId?: string,
): Promise<FingerprintRecord> {
  const computed = await computeFingerprint(input);
  const record: FingerprintRecord = {
    id: crypto.randomUUID(),
    outputId,
    userId: userId ?? null,
    mediaType: computed.mediaType,
    algorithm: computed.algorithm,
    phash: computed.phash,
    ahash: computed.ahash,
    dhash: computed.dhash,
    frameHashes: computed.frameHashes,
    durationMs: computed.durationMs,
    width: computed.width,
    height: computed.height,
    sourceSha256: computed.sourceSha256,
    createdAt: new Date().toISOString(),
  };

  fingerprints.set(record.id, record);

  try {
    if (isPrismaAvailable()) {
      const row = await prisma!.fingerprint.create({
        data: {
          outputId: record.outputId,
          userId: record.userId,
          mediaType: record.mediaType,
          algorithm: record.algorithm,
          phash: record.phash,
          ahash: record.ahash,
          dhash: record.dhash,
          frameHashes: record.frameHashes,
          durationMs: record.durationMs,
          width: record.width,
          height: record.height,
          sourceSha256: record.sourceSha256,
        },
      });
      // Adopt the database id so PiracyMatch.fingerprintId can reference it.
      fingerprints.delete(record.id);
      record.id = row.id;
      fingerprints.set(record.id, record);
    }
  } catch {
    // in-memory only
  }

  return record;
}

async function allFingerprints(): Promise<FingerprintRecord[]> {
  try {
    if (isPrismaAvailable()) {
      const rows = await prisma!.fingerprint.findMany({
        orderBy: { createdAt: 'desc' },
        take: Number(process.env.FINGERPRINT_SEARCH_LIMIT ?? 5000),
      });
      if (rows.length > 0) {
        return rows.map((row) => ({
          id: row.id,
          outputId: row.outputId,
          userId: row.userId,
          mediaType: row.mediaType as MediaType,
          algorithm: row.algorithm,
          phash: row.phash,
          ahash: row.ahash,
          dhash: row.dhash,
          frameHashes: row.frameHashes,
          durationMs: row.durationMs,
          width: row.width,
          height: row.height,
          sourceSha256: row.sourceSha256,
          createdAt: row.createdAt.toISOString(),
        }));
      }
    }
  } catch {
    // fall through to memory
  }
  return [...fingerprints.values()];
}

export function getFingerprints(): FingerprintRecord[] {
  return [...fingerprints.values()];
}

/* ------------------------------------------------------------------ */
/*  Matching                                                           */
/* ------------------------------------------------------------------ */

function confidenceFor(distance: number): MatchConfidence {
  if (distance <= 4) return 'high';
  if (distance <= 8) return 'medium';
  return 'low';
}

/** Compare a computed fingerprint against everything registered. */
export async function findMatches(
  probe: ComputedFingerprint,
  threshold: number = MATCH_THRESHOLD,
): Promise<FingerprintMatch[]> {
  const candidates = await allFingerprints();
  const matches: FingerprintMatch[] = [];

  for (const candidate of candidates) {
    // Two videos are compared frame sequence against frame sequence; anything
    // else falls back to the representative single hash.
    const useSequence = probe.frameHashes.length > 0 && candidate.frameHashes.length > 0;
    const distance = useSequence
      ? sequenceDistance(probe.frameHashes, candidate.frameHashes)
      : hammingDistance(probe.phash, candidate.phash);

    if (distance > threshold) continue;

    matches.push({
      fingerprint: candidate,
      distance: Number(distance.toFixed(2)),
      similarity: similarityFromDistance(distance, HASH_BITS),
      confidence: confidenceFor(distance),
      algorithm: useSequence ? VIDEO_ALGORITHM : IMAGE_ALGORITHM,
      distances: {
        phash: hammingDistance(probe.phash, candidate.phash),
        ahash:
          probe.ahash && candidate.ahash ? hammingDistance(probe.ahash, candidate.ahash) : null,
        dhash:
          probe.dhash && candidate.dhash ? hammingDistance(probe.dhash, candidate.dhash) : null,
      },
    });
  }

  return matches.sort((a, b) => a.distance - b.distance);
}

/** Fingerprint supplied media and search for matches in one step. */
export async function matchAsset(
  input: AssetInput,
  threshold: number = MATCH_THRESHOLD,
): Promise<{ probe: ComputedFingerprint; matches: FingerprintMatch[] }> {
  const probe = await computeFingerprint(input);
  return { probe, matches: await findMatches(probe, threshold) };
}

/* ------------------------------------------------------------------ */
/*  Capabilities                                                       */
/* ------------------------------------------------------------------ */

export interface FingerprintCapabilities {
  image_fingerprinting: {
    available: true;
    algorithm: string;
    hash_bits: number;
  };
  video_fingerprinting: {
    available: boolean;
    algorithm: string;
    frame_samples: number;
    requires: string;
    detail: string | null;
  };
  match_threshold: number;
  known_limitations: string[];
}

export async function getFingerprintCapabilities(): Promise<FingerprintCapabilities> {
  const status = await ffmpegStatus();
  return {
    image_fingerprinting: {
      available: true,
      algorithm: IMAGE_ALGORITHM,
      hash_bits: HASH_BITS,
    },
    video_fingerprinting: {
      available: status.available,
      algorithm: VIDEO_ALGORITHM,
      frame_samples: VIDEO_FRAME_SAMPLES,
      requires: 'ffmpeg + ffprobe on PATH (or FFMPEG_PATH / FFPROBE_PATH)',
      detail: status.available ? status.version : status.error,
    },
    match_threshold: MATCH_THRESHOLD,
    known_limitations: [
      'Global perceptual hashing does not reliably match crops beyond ~10% of the frame, rotations, or heavy letterboxing.',
      'Matching is a linear scan; it needs an ANN/BK-tree index before it scales past ~10^5 fingerprints.',
    ],
  };
}
