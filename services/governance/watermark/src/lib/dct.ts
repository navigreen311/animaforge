/**
 * 8x8 DCT-II / DCT-III (inverse) primitives.
 *
 * These are the same basis functions JPEG uses, which is exactly why the
 * watermark survives a JPEG re-encode: we perturb coefficients on the *same*
 * 8x8 grid the codec quantises, so the perturbation is quantised alongside the
 * image content rather than being smeared across it.
 */

export const BLOCK = 8;

/** cos((2x+1) * u * PI / 16), precomputed for all (x, u) in [0, 8). */
const COS: number[][] = [];
for (let x = 0; x < BLOCK; x++) {
  COS[x] = [];
  for (let u = 0; u < BLOCK; u++) {
    COS[x][u] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * BLOCK));
  }
}

/** Orthonormalisation factor: 1/sqrt(2) for the DC term, 1 otherwise. */
function c(u: number): number {
  return u === 0 ? Math.SQRT1_2 : 1;
}

/** Forward 8x8 DCT-II. `block` and `out` are row-major Float64Array(64). */
export function dct8x8(block: Float64Array, out: Float64Array): void {
  for (let u = 0; u < BLOCK; u++) {
    for (let v = 0; v < BLOCK; v++) {
      let sum = 0;
      for (let x = 0; x < BLOCK; x++) {
        const cxu = COS[x][u];
        const rowBase = x * BLOCK;
        for (let y = 0; y < BLOCK; y++) {
          sum += block[rowBase + y] * cxu * COS[y][v];
        }
      }
      out[u * BLOCK + v] = 0.25 * c(u) * c(v) * sum;
    }
  }
}

/** Inverse 8x8 DCT (DCT-III). `coef` and `out` are row-major Float64Array(64). */
export function idct8x8(coef: Float64Array, out: Float64Array): void {
  for (let x = 0; x < BLOCK; x++) {
    for (let y = 0; y < BLOCK; y++) {
      let sum = 0;
      for (let u = 0; u < BLOCK; u++) {
        const cu = c(u);
        const cxu = COS[x][u];
        const rowBase = u * BLOCK;
        for (let v = 0; v < BLOCK; v++) {
          sum += cu * c(v) * coef[rowBase + v] * cxu * COS[y][v];
        }
      }
      out[x * BLOCK + y] = 0.25 * sum;
    }
  }
}

/**
 * Square DCT-II of an arbitrary NxN matrix. Used by perceptual hashing, which
 * works on a 32x32 reduction rather than on 8x8 blocks.
 */
export function dctSquare(input: Float64Array, n: number): Float64Array {
  const cosN: number[][] = [];
  for (let x = 0; x < n; x++) {
    cosN[x] = [];
    for (let u = 0; u < n; u++) {
      cosN[x][u] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
    }
  }
  // Separable transform: rows first, then columns.
  const tmp = new Float64Array(n * n);
  for (let x = 0; x < n; x++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let y = 0; y < n; y++) sum += input[x * n + y] * cosN[y][v];
      tmp[x * n + v] = sum * c(v);
    }
  }
  const out = new Float64Array(n * n);
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let x = 0; x < n; x++) sum += tmp[x * n + v] * cosN[x][u];
      out[u * n + v] = sum * c(u);
    }
  }
  return out;
}
