/**
 * Separable DCT-II for square matrices, used by perceptual hashing.
 *
 * (Deliberately a small standalone copy rather than an import from
 * services/governance: the two services are separately deployable and the
 * governance package is not on piracy's TypeScript path. See
 * docs/governance-pipeline.md for the plan to fold both into packages/shared.)
 */

const SQRT1_2 = Math.SQRT1_2;

function scale(u: number): number {
  return u === 0 ? SQRT1_2 : 1;
}

const cosCache = new Map<number, number[][]>();

function basis(n: number): number[][] {
  const cached = cosCache.get(n);
  if (cached) return cached;
  const table: number[][] = [];
  for (let x = 0; x < n; x++) {
    table[x] = [];
    for (let u = 0; u < n; u++) {
      table[x][u] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
    }
  }
  cosCache.set(n, table);
  return table;
}

/** Forward DCT-II of an n x n matrix, row-major in and out. */
export function dctSquare(input: Float64Array, n: number): Float64Array {
  const cos = basis(n);

  const rows = new Float64Array(n * n);
  for (let x = 0; x < n; x++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let y = 0; y < n; y++) sum += input[x * n + y] * cos[y][v];
      rows[x * n + v] = sum * scale(v);
    }
  }

  const out = new Float64Array(n * n);
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let x = 0; x < n; x++) sum += rows[x * n + v] * cos[x][u];
      out[u * n + v] = sum * scale(u);
    }
  }
  return out;
}
