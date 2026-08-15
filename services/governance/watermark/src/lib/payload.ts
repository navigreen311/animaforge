/**
 * Watermark payload framing.
 *
 * A recovered payload is only trusted when its CRC checks out. That is what
 * lets detection report "not found" honestly instead of returning whatever
 * 64 bits of noise the extractor happened to read out of an unmarked image.
 */

/** Bits of watermark key carried in the payload. */
export const KEY_BITS = 48;
/** Bits of CRC-16/CCITT-FALSE appended to the key. */
export const CRC_BITS = 16;
/** Total payload width. */
export const PAYLOAD_BITS = KEY_BITS + CRC_BITS;

/** Hex length of the key (48 bits = 12 hex chars). */
export const KEY_HEX_LENGTH = KEY_BITS / 4;

/** CRC-16/CCITT-FALSE over a bit array (MSB first). */
export function crc16(bits: readonly number[]): number {
  let crc = 0xffff;
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | (bits[i + b] ?? 0);
    crc ^= byte << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}

/** Normalise an arbitrary hex string to exactly KEY_HEX_LENGTH characters. */
export function normaliseKeyHex(hex: string): string {
  const clean = hex.replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (clean.length >= KEY_HEX_LENGTH) return clean.slice(0, KEY_HEX_LENGTH);
  return clean.padStart(KEY_HEX_LENGTH, "0");
}

/** Derive the 48-bit watermark key from a UUID (or any hex-ish identifier). */
export function keyFromIdentifier(identifier: string): string {
  return normaliseKeyHex(identifier);
}

function hexToBits(hex: string, bitCount: number): number[] {
  const bits: number[] = [];
  for (const ch of hex) {
    const nibble = parseInt(ch, 16);
    for (let b = 3; b >= 0; b--) bits.push((nibble >> b) & 1);
  }
  return bits.slice(0, bitCount);
}

function bitsToHex(bits: readonly number[]): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) nibble = (nibble << 1) | (bits[i + b] ?? 0);
    hex += nibble.toString(16);
  }
  return hex;
}

/** Frame a 48-bit key (hex) into the 64-bit on-the-wire payload. */
export function encodePayload(keyHex: string): number[] {
  const keyBits = hexToBits(normaliseKeyHex(keyHex), KEY_BITS);
  const crc = crc16(keyBits);
  const crcBits: number[] = [];
  for (let b = CRC_BITS - 1; b >= 0; b--) crcBits.push((crc >> b) & 1);
  return [...keyBits, ...crcBits];
}

export interface DecodedPayload {
  /** True only when the recovered CRC matches the recovered key. */
  valid: boolean;
  keyHex: string;
}

/** Recover a key from 64 extracted bits, rejecting it unless the CRC matches. */
export function decodePayload(bits: readonly number[]): DecodedPayload {
  if (bits.length < PAYLOAD_BITS) return { valid: false, keyHex: "" };
  const keyBits = bits.slice(0, KEY_BITS);
  let crc = 0;
  for (let i = KEY_BITS; i < PAYLOAD_BITS; i++) crc = (crc << 1) | bits[i];
  return { valid: crc16(keyBits) === crc, keyHex: bitsToHex(keyBits) };
}

/**
 * Deterministic block permutation.
 *
 * Spreading each payload bit over blocks scattered across the frame — rather
 * than over one contiguous band — means a local edit (a logo overlay, a crop
 * of one corner) degrades every bit a little instead of destroying a few
 * outright, which the majority vote can absorb.
 */
export function blockOrder(count: number, seed: number): Uint32Array {
  let s = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  const idx = new Uint32Array(count);
  for (let i = 0; i < count; i++) idx[i] = i;
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const t = idx[i];
    idx[i] = idx[j];
    idx[j] = t;
  }
  return idx;
}

/** Turn a hex seed string into the uint32 the permutation wants. */
export function seedFromHex(hex: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < hex.length; i++) {
    h ^= hex.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
