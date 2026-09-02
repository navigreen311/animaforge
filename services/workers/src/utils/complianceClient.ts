/* ---------- Marketing Compliance Client ---------- */

/**
 * The client for CapitalForge's Communication Compliance Scanner.
 *
 * WHY THIS CALLS ANOTHER SERVICE INSTEAD OF HOLDING A PHRASE LIST
 * ===============================================================
 *
 *     The banned-phrase list already exists. It lives in CapitalForge's
 *     `comm-compliance.service.ts`, it carries a legal citation and a
 *     compliant alternative per claim, and it is the list Burkham Wickmont's
 *     compliance officers maintain.
 *
 *     Copying it here would produce two lists. Two lists drift, and the drift
 *     is silent: the copy keeps returning "clean" against phrases the real
 *     list started blocking months ago, and nothing fails. So this file holds
 *     no phrases at all. It holds a URL.
 *
 *     The cost of that choice is a runtime dependency on another service, and
 *     that cost is paid deliberately in `scanFailsClosed` below.
 *
 * WHAT A FAILURE MEANS HERE
 * =========================
 *
 *     Every other client in this directory retries and then throws. This one
 *     retries and then refuses, and the distinction matters: a moderation
 *     service that is down is a reason not to render, not a reason to render
 *     unchecked. `ComplianceUnavailableError` exists so the caller cannot
 *     accidentally treat "we could not check" as "we checked and it passed" —
 *     the two are different sentences and only one of them permits a render.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/* ---------- Types ---------- */

/** One banned-claim hit, as CapitalForge reports it. */
export interface ComplianceViolation {
  claimId: string;
  category: string;
  label: string;
  evidence: string;
  /** The FIRST position. See `positions` for the rest. */
  position: number;
  severityWeight: number;
  legalCitation: string;
  compliantAlternative?: string;
  /**
   * How many times this claim appears in the script, and where.
   *
   * CapitalForge deduplicates by claim id — nine "guaranteed approval"s are
   * one violation to fix, not nine, and the risk score does not multiply. But
   * it now reports the count, and this interface did not carry it, so the
   * repetition was dropped at the boundary rather than in the scan: a script
   * saying it nine times arrived at the render gate looking like one hit.
   *
   * That matters more here than it does for an advisor's email. A marketing
   * script reaches an audience, and a claim repeated through a video is a
   * different thing from a claim made once in passing.
   *
   * Optional, because a CapitalForge older than 2026-09-01 does not send them
   * and this client must not turn a missing field into a crash on a path that
   * decides whether a render proceeds.
   */
  occurrences?: number;
  positions?: number[];
}

/** The scan result, narrowed to the fields a render decision needs. */
export interface ComplianceScanResult {
  scanId: string;
  /** True only when the risk score is zero. CapitalForge decides this, not us. */
  approved: boolean;
  riskScore: number;
  riskLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  violations: ComplianceViolation[];
  summary: string;
}

/**
 * Raised when the scanner could not be reached, is not configured, or answered
 * in a shape this client does not understand.
 *
 * It is a distinct type from a violation because the two demand different
 * responses from an operator: a violation means the script is wrong, and this
 * means the check did not happen.
 */
export class ComplianceUnavailableError extends Error {
  constructor(reason: string) {
    super(
      `Marketing compliance scan could not be performed: ${reason}. ` +
        'The render is refused rather than proceeding unchecked — an unscanned ' +
        'script that reaches render becomes a signed artefact, and a signature ' +
        'on a non-compliant video asserts provenance for the violation.',
    );
    this.name = 'ComplianceUnavailableError';
  }
}

/* ---------- Configuration ---------- */

interface ScannerConfig {
  url: string;
  token: string;
  advisorId: string;
}

/**
 * Read the scanner configuration, or explain precisely what is missing.
 *
 * Unconfigured is a refusal, never a bypass. The same rule the CRE Forge
 * adapter applies to its tenant credential: treating "no credential set" as
 * "allow everything" is how an ungated path reaches production, and it does it
 * quietly, because a missing environment variable produces no error of its own.
 */
function readConfig(): ScannerConfig {
  const url = process.env.COMPLIANCE_SCAN_URL;
  const token = process.env.COMPLIANCE_SCAN_TOKEN;
  // CapitalForge attributes every scan to an advisor. A render has no advisor,
  // so the deployment names a service principal — one that is a real row, so
  // the compliance record points at something when somebody asks who scanned.
  const advisorId = process.env.COMPLIANCE_SCAN_ADVISOR_ID;

  const missing = [
    !url && 'COMPLIANCE_SCAN_URL',
    !token && 'COMPLIANCE_SCAN_TOKEN',
    !advisorId && 'COMPLIANCE_SCAN_ADVISOR_ID',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new ComplianceUnavailableError(
      `not configured (missing ${missing.join(', ')})`,
    );
  }

  return { url: url!, token: token!, advisorId: advisorId! };
}

/** True when a marketing compliance scanner is configured for this deployment. */
export function isComplianceScannerConfigured(): boolean {
  try {
    readConfig();
    return true;
  } catch {
    return false;
  }
}

/* ---------- Scan ---------- */

/**
 * Raised at boot when the scanner is reachable and says our identity is wrong.
 *
 * Distinct from `ComplianceUnavailableError`, which means we could not ask.
 * Only one of the two is worth refusing to start over: a scanner that is down
 * at boot may be up in a minute, and the render gate already fails closed per
 * job. A COMPLIANCE_SCAN_ADVISOR_ID that resolves to nobody will not fix
 * itself, and every render will refuse until somebody changes it.
 */
export class ComplianceIdentityError extends Error {
  constructor(reason: string) {
    super(
      `Marketing compliance identity is not usable: ${reason}. `
      + 'Every render will be refused until this is corrected — the gate fails '
      + 'closed, so an unusable identity stops renders rather than letting them '
      + 'through unchecked.',
    );
    this.name = 'ComplianceIdentityError';
  }
}

/**
 * Confirm at boot that our credentials and advisor id are usable.
 *
 * CapitalForge enforces that `advisorId` names a real user in the token's
 * tenant — it used to accept any UUID — so a service principal that was never
 * created, or was created in the wrong tenant, now fails every scan. Because
 * the gate fails closed, the symptom is renders stopping, and the operator
 * finds out from a queue backing up.
 *
 * The preflight endpoint verifies the id and persists nothing, so this can run
 * on every start without filing a compliance record each time.
 *
 * Three outcomes, deliberately not two:
 *
 *   configured and valid   -> resolves
 *   configured and WRONG   -> ComplianceIdentityError: refuse to start
 *   not reachable          -> ComplianceUnavailableError, which the caller
 *                             logs and continues past. A transient outage at
 *                             boot must not take the worker fleet down; the
 *                             gate refuses per job while it lasts.
 */
export async function verifyComplianceIdentity(): Promise<void> {
  const config = readConfig();
  const preflightUrl = `${config.url.replace(/\/+$/, '')}/preflight`;

  let response: Response;
  try {
    response = await fetch(preflightUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ advisorId: config.advisorId }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    // Could not ask. Not the same as being told no.
    throw new ComplianceUnavailableError(
      `preflight could not reach the scanner (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  if (response.status === 404) {
    // A CapitalForge older than the preflight endpoint. Nothing is known to be
    // wrong with our identity, and refusing to boot against an older scanner
    // would make this check cause the outage it exists to warn about.
    throw new ComplianceUnavailableError(
      'the scanner has no /preflight endpoint (older CapitalForge); identity not verified',
    );
  }

  if (response.status >= 400 && response.status < 500) {
    const body = await response.text().catch(() => '');
    throw new ComplianceIdentityError(
      `scanner rejected our preflight with HTTP ${response.status}`
      + `${body ? ` — ${body.slice(0, 300)}` : ''}`,
    );
  }

  if (!response.ok) {
    throw new ComplianceUnavailableError(
      `preflight returned HTTP ${response.status} ${response.statusText}`,
    );
  }
}


/**
 * Scan generation script text against the Marketing Claim Library.
 *
 * Throws `ComplianceUnavailableError` if the scan cannot be completed. It never
 * returns a permissive default: there is no code path through this function
 * that yields `approved: true` without CapitalForge having said so.
 */
export async function scanScript(
  content: string,
  channel: 'video_script' = 'video_script',
): Promise<ComplianceScanResult> {
  const config = readConfig();

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          advisorId: config.advisorId,
          channel,
          content,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // A 4xx is not retried: a rejected body or a bad credential will be
        // rejected identically three times, and retrying it only delays the
        // refusal. A 5xx might be transient, so it falls through to the retry.
        if (response.status >= 400 && response.status < 500) {
          throw new ComplianceUnavailableError(
            `scanner rejected the request with HTTP ${response.status} ${response.statusText}`,
          );
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const body = (await response.json()) as {
        success?: boolean;
        data?: Partial<ComplianceScanResult>;
      };

      const data = body?.data;
      // `approved` must be a real boolean from the scanner. An absent field
      // read as falsy would be safe by luck rather than by design, and the next
      // person to touch this would not know which it was.
      if (!data || typeof data.approved !== 'boolean') {
        throw new ComplianceUnavailableError(
          'scanner returned a body with no `approved` verdict',
        );
      }

      return {
        scanId: data.scanId ?? 'unknown',
        approved: data.approved,
        riskScore: data.riskScore ?? 0,
        riskLevel: data.riskLevel ?? 'clean',
        violations: data.violations ?? [],
        summary: data.summary ?? '',
      };
    } catch (err) {
      // A refusal is final. Only transport failures are worth another attempt.
      if (err instanceof ComplianceUnavailableError) throw err;

      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ComplianceUnavailableError(
    `scanner unreachable after ${MAX_RETRIES} attempts (${lastError?.message ?? 'unknown error'})`,
  );
}
