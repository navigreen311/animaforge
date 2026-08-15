/**
 * TrustMark bridge.
 *
 * TrustMark (Adobe's learned image watermarker) is a Python package that pulls
 * in torch plus ~200 MB of model weights. Neither is vendored here and neither
 * belongs in a Node service image or in CI, so this is an *optional* backend:
 * it is used only when an operator has provisioned it and set
 * `WATERMARK_ENGINE=trustmark`.
 *
 * When it is not provisioned, this module reports that truthfully and the
 * service falls back to the built-in `dct-pair-v1` engine. It never pretends
 * to have run TrustMark.
 *
 * Provisioning (operator, once):
 *   pip install trustmark
 *   export TRUSTMARK_PYTHON=/path/to/venv/bin/python
 *   export WATERMARK_ENGINE=trustmark
 * The first run downloads model weights to the TrustMark cache directory.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const TRUSTMARK_PYTHON = process.env.TRUSTMARK_PYTHON ?? 'python3';

export interface TrustmarkStatus {
  /** Operator asked for TrustMark via WATERMARK_ENGINE. */
  requested: boolean;
  /** The `trustmark` Python package imported successfully. */
  available: boolean;
  version: string | null;
  pythonPath: string;
  error: string | null;
}

const PROBE = [
  '-c',
  'import json,sys\n' +
    'try:\n' +
    '    import trustmark\n' +
    "    print(json.dumps({'ok': True, 'version': getattr(trustmark, '__version__', 'unknown')}))\n" +
    'except Exception as exc:\n' +
    "    print(json.dumps({'ok': False, 'error': f'{type(exc).__name__}: {exc}'}))\n",
];

let cached: TrustmarkStatus | null = null;

export function trustmarkRequested(): boolean {
  return (process.env.WATERMARK_ENGINE ?? '').toLowerCase() === 'trustmark';
}

/** Probe for a usable TrustMark install. Never throws. */
export async function trustmarkStatus(force = false): Promise<TrustmarkStatus> {
  if (cached && !force) return cached;
  const requested = trustmarkRequested();

  if (!requested) {
    cached = {
      requested: false,
      available: false,
      version: null,
      pythonPath: TRUSTMARK_PYTHON,
      error: null,
    };
    return cached;
  }

  try {
    const { stdout } = await execFileAsync(TRUSTMARK_PYTHON, PROBE, {
      timeout: 60_000,
    });
    const parsed = JSON.parse(stdout.trim()) as {
      ok: boolean;
      version?: string;
      error?: string;
    };
    cached = {
      requested,
      available: parsed.ok,
      version: parsed.ok ? (parsed.version ?? 'unknown') : null,
      pythonPath: TRUSTMARK_PYTHON,
      error: parsed.ok ? null : (parsed.error ?? 'import failed'),
    };
  } catch (err) {
    cached = {
      requested,
      available: false,
      version: null,
      pythonPath: TRUSTMARK_PYTHON,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return cached;
}

/** Reset the memoised probe (tests). */
export function resetTrustmarkStatus(): void {
  cached = null;
}
