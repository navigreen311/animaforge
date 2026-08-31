/**
 * The marketing compliance gate — runs BEFORE generation, never after.
 *
 * WHAT THIS REPLACES
 * ==================
 *
 *     Output moderation classified `content_url.split('/').pop()`. It scored
 *     the FILENAME. A video whose narration promised a guaranteed 0% APR
 *     scored 0.0, passed, and was then C2PA-signed and watermarked — shipping
 *     with a cryptographic attestation of provenance attached to a TILA
 *     violation.
 *
 *     That check is still there and still does its own job (violence, sexual
 *     content, impersonation, minors are a different surface). This gate is
 *     the one that reads the words.
 *
 * WHY BEFORE THE RENDER
 * =====================
 *
 *     A banned claim caught at script stage costs nothing: no GPU time, no
 *     artefact, no signature. The same claim caught after render is a signed,
 *     watermarked file that has to be recalled — and the watermark is durable
 *     specifically so it cannot be.
 *
 *     It is also the only point where the claim is legible. After render the
 *     sentence is pixels and audio samples; before it, it is a string, and the
 *     Marketing Claim Library already reads strings.
 *
 * WHAT IT CANNOT SEE
 * ==================
 *
 *     Read `UNCHECKED_SURFACES` below before describing this as coverage. A
 *     scanner whose limits are not written down becomes theatre: everyone
 *     downstream assumes the check is total, and the assumption is invisible
 *     until something ships.
 */

import {
  ComplianceUnavailableError,
  scanScript,
  type ComplianceScanResult,
} from '../utils/complianceClient.js';

/* ---------- What this gate does not reach ---------- */

/**
 * The surfaces a script scan cannot cover, each with whether AnimaForge can
 * actually produce it. This is not a disclaimer — it is the list of ways a
 * banned claim still reaches a viewer with every check in this file passing.
 *
 * Emitted on every gate result so it lands in the job record and the audit
 * trail, rather than living only in a comment somebody has to find.
 */
export const UNCHECKED_SURFACES = [
  {
    surface: 'on_screen_text_added_at_render',
    possible: true,
    detail:
      'The video pipeline composites text from the scene graph. Scene-graph strings ARE scanned ' +
      'by this gate, but any text the renderer or a template introduces after submission is not — ' +
      'nothing downstream of submit_to_ai passes through here.',
  },
  {
    surface: 'voiceover_diverging_from_script',
    possible: true,
    detail:
      'Audio generation takes its own `prompt`, and dubbing/voice-cloning (22 languages) runs as ' +
      'separate jobs. Each job is scanned on its own text, so a translated or re-voiced line is ' +
      'scanned only in the language it was submitted in. The claim library is English-only.',
  },
  {
    surface: 'claims_inside_a_source_image',
    possible: true,
    detail:
      'Avatar reconstruction takes `referenceImages` and cartoon conversion takes an `imageUrl`. ' +
      'A rate card or a guarantee printed inside a supplied image is never converted to text. ' +
      'There is no OCR step anywhere in this pipeline.',
  },
  {
    surface: 'claims_in_generated_imagery',
    possible: true,
    detail:
      'A model asked for "a billboard" may render legible text nobody wrote. The prompt that ' +
      'produced it is scanned; the output is not.',
  },
  {
    surface: 'music_and_sfx_lyrics',
    possible: true,
    detail:
      'Scene-aware composition can produce sung words from a prompt. Only the prompt is scanned.',
  },
  {
    surface: 'non_english_script_text',
    possible: true,
    detail:
      'Every pattern in the Marketing Claim Library is an English regular expression. A Spanish ' +
      'script containing the same claim scans clean.',
  },
] as const;

/* ---------- Text extraction ---------- */

/**
 * Keys whose values are structural rather than expressive: identifiers, URLs,
 * enumerated settings. Scanning them produces noise and no signal.
 *
 * Everything NOT on this list is scanned, which is the deliberate direction.
 * An allow-list of known text fields would miss a claim in a key nobody
 * anticipated, and the whole failure being fixed here is a check that reads
 * the wrong thing and reports success.
 */
const STRUCTURAL_KEYS = new Set([
  'projectid',
  'userid',
  'jobid',
  'id',
  'tier',
  'type',
  'resolution',
  'format',
  'duration',
  'strength',
  'style',
  'input_hash',
  'inputhash',
  'characterrefs',
  'consenttypes',
]);

/** True for values that are references rather than prose. */
function isReference(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{32,}$/i.test(value)
  );
}

export interface ExtractedText {
  /** The concatenated text submitted for scanning. */
  content: string;
  /** Dotted paths of every field that contributed, for the audit record. */
  fields: string[];
}

/**
 * Walk a generation job's params and collect every expressive string.
 *
 * Paths are recorded so a violation can be traced back to the field that
 * carried it. "A banned claim was found" is not actionable; "a banned claim
 * was found in params.sceneGraph.shots[2].dialogue" is.
 */
export function extractScannableText(params: Record<string, unknown>): ExtractedText {
  const parts: string[] = [];
  const fields: string[] = [];

  const walk = (value: unknown, path: string, key: string): void => {
    if (typeof value === 'string') {
      if (STRUCTURAL_KEYS.has(key.toLowerCase())) return;
      const trimmed = value.trim();
      if (trimmed.length < 3 || isReference(trimmed)) return;
      parts.push(trimmed);
      fields.push(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`, key));
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k, k);
      }
    }
  };

  walk(params, 'params', 'params');

  return { content: parts.join('\n\n'), fields };
}

/* ---------- Which job types carry a script ---------- */

/**
 * Generation types that take a text prompt, and therefore can carry a claim in
 * words. For these, a job with no scannable text is anomalous and is refused.
 *
 * The remaining types — `avatar`, `style_clone`, `img_to_cartoon` — transform
 * supplied images and have no script at all. Refusing those would break real
 * functionality that was never capable of making a written claim, and would do
 * it in the name of a check that had nothing to read.
 *
 * That distinction is the whole reason this constant exists rather than a blunt
 * "no text means refuse". But it is also the exact seam where a claim escapes:
 * an image job cannot be scanned, so anything printed inside the image is
 * unchecked. `not_applicable` is therefore a THIRD verdict, recorded as such —
 * never reported as a pass, because "we checked and it was clean" and "there
 * was nothing here we can read" are different statements.
 */
const SCRIPTED_JOB_TYPES = new Set(['video', 'audio']);

/* ---------- The gate ---------- */

export interface ComplianceGateResult {
  /** Whether the render may proceed. */
  allowed: boolean;
  /**
   * What actually happened, kept separate from `allowed`.
   *
   * `not_applicable` is allowed-but-unscanned, and a reader that only looks at
   * `allowed` cannot tell it from `scanned_clean`. Anything reporting coverage
   * must read this field, not that one.
   */
  verdict: 'scanned_clean' | 'scanned_violation' | 'not_applicable' | 'could_not_scan';
  /** Present when the gate refused. Suitable for a job failure reason. */
  blockedReason?: string;
  /** Why no scan was performed, when `verdict` is `not_applicable`. */
  notApplicableReason?: string;
  /** The scanner's verdict, when a scan actually happened. */
  scan?: ComplianceScanResult;
  /** Which param paths were submitted. */
  scannedFields: string[];
  /** How many characters were scanned. Zero is a meaningful answer. */
  scannedCharacters: number;
  /** Carried through to the job record so coverage claims stay honest. */
  uncheckedSurfaces: typeof UNCHECKED_SURFACES;
}

/**
 * Gate a generation job on the Marketing Claim Library.
 *
 * Three outcomes, and they are kept distinct on purpose:
 *   - scanned and clean       -> allowed
 *   - scanned and violating   -> refused, with the claims and their citations
 *   - could not be scanned    -> refused, saying so in those words
 *
 * The third is the one that matters. Collapsing it into either of the others
 * is how a compliance gate stops being one: report it as a pass and unchecked
 * scripts render; report it as a violation and an operator "fixes" a script
 * that was never the problem.
 */
export async function runMarketingComplianceGate(
  params: Record<string, unknown>,
  jobType?: string,
): Promise<ComplianceGateResult> {
  const { content, fields } = extractScannableText(params);

  const base = {
    scannedFields: fields,
    scannedCharacters: content.length,
    uncheckedSurfaces: UNCHECKED_SURFACES,
  };

  if (content.length === 0) {
    // An image-transform job has no script and never could have one. Refusing
    // it would break a path that cannot make a written claim; calling it clean
    // would assert a check that did not happen. It is neither.
    if (jobType !== undefined && !SCRIPTED_JOB_TYPES.has(jobType)) {
      return {
        allowed: true,
        verdict: 'not_applicable',
        notApplicableReason:
          `Generation type '${jobType}' transforms supplied images and carries no script. ` +
          'No text was scanned. Any claim printed inside a source or generated image is ' +
          'unchecked — see uncheckedSurfaces.claims_inside_a_source_image.',
        ...base,
      };
    }

    // A scripted job with no text is anomalous: a video or audio generation
    // reaches here with a prompt, so an empty one means either a malformed job
    // or a claim living entirely in a surface this gate cannot read. Refused
    // rather than passed — saying "clean" here is a statement the gate cannot
    // support.
    return {
      allowed: false,
      verdict: 'could_not_scan',
      blockedReason:
        `No scannable script text found in this ${jobType ?? 'scripted'} job. The marketing ` +
        'compliance gate has nothing to check, and an unscannable scripted job is refused ' +
        'rather than passed. If this generation genuinely carries no text, it must be routed ' +
        'through an explicit exemption rather than through silence.',
      ...base,
    };
  }

  let scan: ComplianceScanResult;
  try {
    scan = await scanScript(content, 'video_script');
  } catch (err) {
    // FAIL CLOSED. Stated here and in the error message itself.
    const reason =
      err instanceof ComplianceUnavailableError
        ? err.message
        : new ComplianceUnavailableError(err instanceof Error ? err.message : String(err)).message;
    return { allowed: false, verdict: 'could_not_scan', blockedReason: reason, ...base };
  }

  if (!scan.approved) {
    const detail = scan.violations
      .map((v) => `${v.label} (${v.category}, ${v.legalCitation}): "${v.evidence}"`)
      .join('; ');

    return {
      allowed: false,
      verdict: 'scanned_violation',
      blockedReason:
        `Marketing compliance refused this script before render. ` +
        `${scan.violations.length} banned claim(s), risk ${scan.riskScore}/100 (${scan.riskLevel}). ` +
        `${detail}`,
      scan,
      ...base,
    };
  }

  return { allowed: true, verdict: 'scanned_clean', scan, ...base };
}
