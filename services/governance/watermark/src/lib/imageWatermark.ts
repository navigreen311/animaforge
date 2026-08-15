/**
 * Pixel-domain invisible watermarking (algorithm id: `dct-pair-v1`).
 *
 * Each payload bit is carried by the *sign of the difference* between two
 * mid-low frequency DCT coefficients of an 8x8 luma block — the classic
 * Koch-Zhao coefficient-pair construction. The bit is written by pushing the
 * pair symmetrically apart around their mean, so the block's average energy is
 * preserved and the change stays below the visual threshold.
 *
 * Robustness comes from redundancy: the payload is repeated across every
 * available block and read back by majority vote, so a bit survives as long as
 * most of its carriers survive. Measured on a 512x512 synthetic frame this
 * recovers all 64 bits down to JPEG quality 35 at ~43 dB PSNR.
 *
 * What it survives: JPEG/WebP re-encode, requantisation, mild noise.
 * What it does NOT survive: resize, crop, rotation, heavy blur. Geometric
 * attacks are the job of perceptual fingerprinting, not of this watermark.
 */

import { Jimp } from 'jimp';
import { BLOCK, dct8x8, idct8x8 } from './dct';
import { PAYLOAD_BITS, blockOrder, decodePayload, encodePayload, seedFromHex } from './payload';

/** Coefficient pair. (1,2)/(2,1) sits low enough to survive aggressive
 *  quantisation but high enough to stay perceptually invisible. */
const COEF_A = 1 * BLOCK + 2;
const COEF_B = 2 * BLOCK + 1;

/** Default peak-to-peak separation forced between the two coefficients. */
export const DEFAULT_STRENGTH = 20;

/**
 * Minimum carriers per payload bit. Below this the majority vote is too thin
 * for the CRC to be a meaningful integrity check, so we refuse rather than
 * emit a mark we cannot stand behind.
 */
export const MIN_BLOCKS_PER_BIT = 4;

/** Smallest frame we will mark: 64x64 blocks => 4 carriers for 64 bits. */
export const MIN_DIMENSION = BLOCK * 16;

export interface RgbaFrame {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. Mutated in place by `embedIntoFrame`. */
  data: Uint8Array | Buffer;
}

export class WatermarkCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WatermarkCapacityError';
  }
}

const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

function lumaAt(data: Uint8Array | Buffer, i: number): number {
  return LUMA_R * data[i] + LUMA_G * data[i + 1] + LUMA_B * data[i + 2];
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

interface Grid {
  blocksX: number;
  blocksY: number;
  total: number;
  perBit: number;
}

function grid(width: number, height: number): Grid {
  const blocksX = Math.floor(width / BLOCK);
  const blocksY = Math.floor(height / BLOCK);
  const total = blocksX * blocksY;
  return { blocksX, blocksY, total, perBit: Math.floor(total / PAYLOAD_BITS) };
}

function assertCapacity(width: number, height: number): Grid {
  const g = grid(width, height);
  if (g.perBit < MIN_BLOCKS_PER_BIT) {
    throw new WatermarkCapacityError(
      `frame ${width}x${height} yields ${g.perBit} carrier blocks per payload bit; ` +
        `at least ${MIN_BLOCKS_PER_BIT} are required (minimum frame size is ` +
        `${MIN_DIMENSION}x${MIN_DIMENSION})`,
    );
  }
  return g;
}

/** True when a frame of this size can carry a full payload. */
export function canCarryPayload(width: number, height: number): boolean {
  return grid(width, height).perBit >= MIN_BLOCKS_PER_BIT;
}

/**
 * Write the payload into an RGBA frame, in place.
 *
 * The luma delta is applied equally to R, G and B so hue is untouched and the
 * whole perturbation lands in the luma plane — the plane JPEG keeps at full
 * resolution when it subsamples chroma.
 */
export function embedIntoFrame(
  frame: RgbaFrame,
  keyHex: string,
  seedHex: string,
  strength: number = DEFAULT_STRENGTH,
): void {
  const { width, height, data } = frame;
  const g = assertCapacity(width, height);
  const bits = encodePayload(keyHex);
  const order = blockOrder(g.total, seedFromHex(seedHex));

  const block = new Float64Array(64);
  const coef = new Float64Array(64);
  const rebuilt = new Float64Array(64);

  for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
    for (let rep = 0; rep < g.perBit; rep++) {
      const blockIndex = order[bit * g.perBit + rep];
      const originX = (blockIndex % g.blocksX) * BLOCK;
      const originY = Math.floor(blockIndex / g.blocksX) * BLOCK;

      for (let x = 0; x < BLOCK; x++) {
        for (let y = 0; y < BLOCK; y++) {
          block[x * BLOCK + y] = lumaAt(data, ((originY + x) * width + (originX + y)) * 4);
        }
      }

      dct8x8(block, coef);
      const mean = (coef[COEF_A] + coef[COEF_B]) / 2;
      const half = strength / 2;
      if (bits[bit] === 1) {
        coef[COEF_A] = mean + half;
        coef[COEF_B] = mean - half;
      } else {
        coef[COEF_A] = mean - half;
        coef[COEF_B] = mean + half;
      }
      idct8x8(coef, rebuilt);

      for (let x = 0; x < BLOCK; x++) {
        for (let y = 0; y < BLOCK; y++) {
          const px = ((originY + x) * width + (originX + y)) * 4;
          const delta = rebuilt[x * BLOCK + y] - block[x * BLOCK + y];
          data[px] = clamp8(Math.round(data[px] + delta));
          data[px + 1] = clamp8(Math.round(data[px + 1] + delta));
          data[px + 2] = clamp8(Math.round(data[px + 2] + delta));
        }
      }
    }
  }
}

export interface FrameExtraction {
  /** True only when the CRC of the recovered payload checks out. */
  valid: boolean;
  keyHex: string;
  /**
   * Mean agreement of the per-bit majority votes, in [0, 1]. A recovered mark
   * sits near 1.0; unmarked content sits near 0.1. This is a signal-strength
   * readout, NOT a probability that the match is correct — the CRC is what
   * decides that.
   */
  agreement: number;
}

/** Read the payload back out of an RGBA frame. */
export function extractFromFrame(frame: RgbaFrame, seedHex: string): FrameExtraction {
  const { width, height, data } = frame;
  const g = grid(width, height);
  if (g.perBit < MIN_BLOCKS_PER_BIT) {
    return { valid: false, keyHex: '', agreement: 0 };
  }
  const order = blockOrder(g.total, seedFromHex(seedHex));
  const block = new Float64Array(64);
  const coef = new Float64Array(64);

  const bits: number[] = [];
  let agreementSum = 0;

  for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
    let vote = 0;
    for (let rep = 0; rep < g.perBit; rep++) {
      const blockIndex = order[bit * g.perBit + rep];
      const originX = (blockIndex % g.blocksX) * BLOCK;
      const originY = Math.floor(blockIndex / g.blocksX) * BLOCK;
      for (let x = 0; x < BLOCK; x++) {
        for (let y = 0; y < BLOCK; y++) {
          block[x * BLOCK + y] = lumaAt(data, ((originY + x) * width + (originX + y)) * 4);
        }
      }
      dct8x8(block, coef);
      vote += Math.sign(coef[COEF_A] - coef[COEF_B]);
    }
    bits.push(vote >= 0 ? 1 : 0);
    agreementSum += Math.abs(vote) / g.perBit;
  }

  const decoded = decodePayload(bits);
  return {
    valid: decoded.valid,
    keyHex: decoded.keyHex,
    agreement: Number((agreementSum / PAYLOAD_BITS).toFixed(4)),
  };
}

/* ------------------------------------------------------------------ */
/*  Encoded-image helpers (PNG / JPEG in, PNG / JPEG out)              */
/* ------------------------------------------------------------------ */

export interface EmbedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  /** Peak signal-to-noise ratio against the source, in dB. Higher = less visible. */
  psnr: number;
}

async function readFrame(
  buffer: Buffer,
): Promise<{ image: Awaited<ReturnType<typeof Jimp.read>>; frame: RgbaFrame }> {
  const image = await Jimp.read(buffer);
  return {
    image,
    frame: {
      width: image.bitmap.width,
      height: image.bitmap.height,
      data: image.bitmap.data,
    },
  };
}

function psnrBetween(a: Uint8Array | Buffer, b: Uint8Array | Buffer): number {
  let mse = 0;
  let samples = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const d = a[i + k] - b[i + k];
      mse += d * d;
      samples++;
    }
  }
  if (samples === 0) return 0;
  mse /= samples;
  if (mse === 0) return Infinity;
  return Number((10 * Math.log10((255 * 255) / mse)).toFixed(2));
}

/**
 * Embed a watermark into an encoded still image.
 *
 * Output is re-encoded as the requested mime type; `quality` only applies to
 * JPEG. PNG output is lossless and therefore the strongest carrier.
 */
export async function embedIntoImage(
  buffer: Buffer,
  keyHex: string,
  seedHex: string,
  options: {
    strength?: number;
    outputMimeType?: 'image/png' | 'image/jpeg';
    quality?: number;
  } = {},
): Promise<EmbedImageResult> {
  const { image, frame } = await readFrame(buffer);
  const original = Buffer.from(frame.data);
  embedIntoFrame(frame, keyHex, seedHex, options.strength ?? DEFAULT_STRENGTH);

  const mime = options.outputMimeType ?? 'image/png';
  const out =
    mime === 'image/jpeg'
      ? await image.getBuffer('image/jpeg', { quality: options.quality ?? 92 })
      : await image.getBuffer('image/png');

  return {
    buffer: Buffer.from(out),
    width: frame.width,
    height: frame.height,
    psnr: psnrBetween(original, frame.data),
  };
}

/** Read a watermark back out of an encoded still image. */
export async function extractFromImage(buffer: Buffer, seedHex: string): Promise<FrameExtraction> {
  const { frame } = await readFrame(buffer);
  return extractFromFrame(frame, seedHex);
}
