/**
 * Perceptual hashing (X4 fingerprinting).
 *
 * A cryptographic hash answers "are these the same bytes"; a re-upload never
 * is. A perceptual hash answers "do these look the same", which is the
 * question piracy detection actually needs. Two copies of the same frame stay
 * within a few bits of each other across re-encode, rescale and mild cropping,
 * so matching becomes a Hamming-distance search rather than an equality lookup.
 */

import { Jimp } from "jimp";
import { dctSquare } from "./dct";

/** Working resolution for the DCT hash. 32x32 keeps the low-frequency plane
 *  stable while discarding the detail that compression destroys first. */
const PHASH_SIZE = 32;
/** Side of the low-frequency block kept from the DCT: 8x8 => 64 bits. */
const PHASH_BLOCK = 8;

export const HASH_BITS = 64;

export interface PerceptualHashes {
  phash: string;
  ahash: string;
  dhash: string;
  width: number;
  height: number;
}

export interface RgbaFrame {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

function toHex(bits: readonly number[]): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) nibble = (nibble << 1) | (bits[i + b] ?? 0);
    hex += nibble.toString(16);
  }
  return hex;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Box-filter downscale of an RGBA frame to an n x m luma matrix. */
function toLumaMatrix(
  frame: RgbaFrame,
  outWidth: number,
  outHeight: number,
): Float64Array {
  const { width, height, data } = frame;
  const out = new Float64Array(outWidth * outHeight);
  const cellW = width / outWidth;
  const cellH = height / outHeight;

  for (let oy = 0; oy < outHeight; oy++) {
    const y0 = Math.floor(oy * cellH);
    const y1 = Math.max(y0 + 1, Math.floor((oy + 1) * cellH));
    for (let ox = 0; ox < outWidth; ox++) {
      const x0 = Math.floor(ox * cellW);
      const x1 = Math.max(x0 + 1, Math.floor((ox + 1) * cellW));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1 && y < height; y++) {
        for (let x = x0; x < x1 && x < width; x++) {
          const i = (y * width + x) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count++;
        }
      }
      out[oy * outWidth + ox] = count ? sum / count : 0;
    }
  }
  return out;
}

/** 64-bit DCT perceptual hash. */
export function phashOfFrame(frame: RgbaFrame): string {
  const luma = toLumaMatrix(frame, PHASH_SIZE, PHASH_SIZE);
  const coef = dctSquare(luma, PHASH_SIZE);

  const block: number[] = [];
  for (let u = 0; u < PHASH_BLOCK; u++) {
    for (let v = 0; v < PHASH_BLOCK; v++) block.push(coef[u * PHASH_SIZE + v]);
  }
  // The DC term encodes overall brightness, not structure — excluding it from
  // the threshold is what makes the hash survive exposure/gamma shifts.
  const threshold = median(block.slice(1));
  return toHex(block.map((c) => (c > threshold ? 1 : 0)));
}

/** 64-bit average hash. */
export function ahashOfFrame(frame: RgbaFrame): string {
  const luma = toLumaMatrix(frame, 8, 8);
  let mean = 0;
  for (const v of luma) mean += v;
  mean /= luma.length;
  return toHex(Array.from(luma, (v) => (v > mean ? 1 : 0)));
}

/** 64-bit difference hash (horizontal gradient). */
export function dhashOfFrame(frame: RgbaFrame): string {
  const luma = toLumaMatrix(frame, 9, 8);
  const bits: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits.push(luma[y * 9 + x] > luma[y * 9 + x + 1] ? 1 : 0);
    }
  }
  return toHex(bits);
}

export function hashFrame(frame: RgbaFrame): PerceptualHashes {
  return {
    phash: phashOfFrame(frame),
    ahash: ahashOfFrame(frame),
    dhash: dhashOfFrame(frame),
    width: frame.width,
    height: frame.height,
  };
}

/** Decode an encoded still image and hash it. */
export async function hashImageBuffer(
  buffer: Buffer,
): Promise<PerceptualHashes> {
  const image = await Jimp.read(buffer);
  return hashFrame({
    width: image.bitmap.width,
    height: image.bitmap.height,
    data: image.bitmap.data,
  });
}

/* ------------------------------------------------------------------ */
/*  Distance                                                           */
/* ------------------------------------------------------------------ */

const POPCOUNT = new Uint8Array(16);
for (let i = 0; i < 16; i++) {
  POPCOUNT[i] = (i & 1) + ((i >> 1) & 1) + ((i >> 2) & 1) + ((i >> 3) & 1);
}

/**
 * Hamming distance between two hex-encoded hashes.
 *
 * Returns `HASH_BITS` (maximum distance) for malformed or mismatched inputs
 * rather than throwing, so one bad row cannot abort a whole scan — but the
 * value is deliberately "as different as possible", never "similar".
 */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return HASH_BITS;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16);
    const y = parseInt(b[i], 16);
    if (Number.isNaN(x) || Number.isNaN(y)) return HASH_BITS;
    distance += POPCOUNT[(x ^ y) & 0xf];
  }
  return distance;
}

/** Map a Hamming distance to a 0..1 similarity over the full hash width. */
export function similarityFromDistance(
  distance: number,
  bits = HASH_BITS,
): number {
  return Number(Math.max(0, 1 - distance / bits).toFixed(4));
}

/**
 * Distance between two video fingerprints.
 *
 * Compared frame-by-frame over the shorter sequence and averaged, so a clip cut
 * from a longer original still scores close on the frames they share.
 */
export function sequenceDistance(
  a: readonly string[],
  b: readonly string[],
): number {
  if (a.length === 0 || b.length === 0) return HASH_BITS;
  const n = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < n; i++) total += hammingDistance(a[i], b[i]);
  return total / n;
}
