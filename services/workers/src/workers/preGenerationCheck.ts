import { preCheckSafety, validateConsent } from '../utils/governanceClient.js';

/**
 * The pre-generation checks. TWO controls, separately governed.
 *
 * WHY THEY ARE SEPARATE
 * =====================
 *
 *     These were one verdict, and that forced one decision on two unlike things.
 *
 *     SAFETY is a keyword classifier. Even with word boundaries it refuses "shoot the
 *     interview" in a video production tool, and it has never run against real traffic
 *     because none exists. It shadows.
 *
 *     CONSENT is a fact. A character has a likeness consent on record or it does not;
 *     there is no false positive to have. Refusing to generate a person's likeness
 *     without their recorded permission is the control working, and there is no version
 *     of "measure it first" that makes an absent consent acceptable. It enforces.
 *
 *     Reporting them together meant the weaker signal set the policy for the stronger
 *     one. They now carry their own modes and their own verdicts.
 *
 * WHAT ENFORCING CONSENT REFUSES TODAY — measured, not assumed
 * ============================================================
 *
 *     Run against the seeded database
 *     (`services/governance/consent/src/__tests__/seeded-consent-audit.test.ts`):
 *
 *         0 of 4 seeded jobs refused        — none declares a character
 *         0 of 12 shots declare characters
 *         5 of 5 characters WOULD be refused if they did
 *         0 consent subjects are characters — the ids do not overlap at all
 *         `motion` is never granted by any seeded consent
 *
 *     So enforcing consent is a no-op today, and becomes a total block the moment
 *     `characterRefs` are populated. That is the opposite of reassuring: the control
 *     is off because the plumbing is absent, not because consent is satisfied.
 *
 *     It is switched on anyway, because a control that refuses nothing costs nothing
 *     and a control that is absent when the plumbing lands is how an unconsented
 *     likeness ships. What must not happen is reading "0 refused" as "consent is fine".
 *
 * THE HOLE THAT REMAINS, NAMED
 * ============================
 *
 *     A job that declares no `characterRefs` passes consent entirely — including one
 *     whose prompt names five characters, which is exactly what all twelve seeded
 *     shots look like. Consent enforcement is bypassed by not declaring.
 *
 *     It is not closed here by refusing undeclared jobs: text-to-video legitimately has
 *     no characters, and refusing those would stop the product to fix a data-modelling
 *     gap. Instead the verdict is `not_applicable`, distinct from `passed`, so
 *     "we checked and it was fine" and "there was nothing to check" never read alike.
 */

/* ---------- Types ---------- */

export type CheckMode = 'shadow' | 'enforce' | 'off';

export type HalfVerdict = 'passed' | 'refused' | 'not_applicable' | 'unavailable';

export interface CheckHalf {
  verdict: HalfVerdict;
  /** What the check said, independent of whether it was acted on. */
  wouldHaveRefused: boolean;
  /** Whether this half actually blocked the job. */
  enforced: boolean;
  mode: CheckMode;
  detail?: string;
}

export interface PreCheckResult {
  /** Whether generation may proceed. False only if an ENFORCING half refused. */
  allowed: boolean;
  safety: CheckHalf;
  consent: CheckHalf;
  /** Reason suitable for a job failure, when `allowed` is false. */
  blockedReason?: string;

  /* --- kept for callers that predate the split --- */
  /** True if either half would have refused, whatever was enforced. */
  wouldHaveRefused: boolean;
  blockedCategories?: string[];
  missingConsents?: string[];
}

/**
 * Safety mode. Default `shadow`, and anything unrecognised is `shadow` — a typo must
 * not silently start declining work on a classifier nobody has measured.
 */
export function safetyMode(): CheckMode {
  const value = process.env.PRECHECK_MODE;
  if (value === 'enforce' || value === 'off') return value;
  return 'shadow';
}

/**
 * Consent mode. Default `enforce`, and anything unrecognised is `enforce` — the
 * opposite default to safety, for the opposite reason. A typo here must not silently
 * stop enforcing a control that has no false positives.
 */
export function consentMode(): CheckMode {
  const value = process.env.CONSENT_MODE;
  if (value === 'shadow' || value === 'off') return value;
  return 'enforce';
}

/** Backwards-compatible alias. Prefer `safetyMode`. */
export const preCheckMode = safetyMode;

/* ---------- The checks ---------- */

async function runSafety(
  prompt: string,
  sceneGraph: Record<string, unknown>,
  mode: CheckMode,
): Promise<CheckHalf> {
  if (mode === 'off') {
    return { verdict: 'not_applicable', wouldHaveRefused: false, enforced: false, mode };
  }

  let result: Awaited<ReturnType<typeof preCheckSafety>>;
  try {
    result = await preCheckSafety(prompt, sceneGraph);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      verdict: 'unavailable',
      wouldHaveRefused: true,
      enforced: mode === 'enforce',
      mode,
      detail:
        `safety pre-check could not be performed: ${reason}. ` +
        (mode === 'enforce'
          ? 'Refused rather than proceeding unchecked.'
          : 'Shadow mode: recorded, not enforced.'),
    };
  }

  if (result.safe) {
    return { verdict: 'passed', wouldHaveRefused: false, enforced: false, mode };
  }

  return {
    verdict: 'refused',
    wouldHaveRefused: true,
    enforced: mode === 'enforce',
    mode,
    detail: `blocked categories: ${result.blockedCategories.join(', ')}`,
  };
}

async function runConsent(characterRefs: string[], mode: CheckMode): Promise<CheckHalf> {
  if (mode === 'off') {
    return { verdict: 'not_applicable', wouldHaveRefused: false, enforced: false, mode };
  }

  // No declared characters is NOT a pass. Nothing was checked, and saying "passed"
  // about it would make an undeclared job indistinguishable from a consented one.
  if (characterRefs.length === 0) {
    return {
      verdict: 'not_applicable',
      wouldHaveRefused: false,
      enforced: false,
      mode,
      detail:
        'no characterRefs declared, so no consent was checked. A prompt naming people ' +
        'without declaring them reaches here as not_applicable, not as passed.',
    };
  }

  let result: Awaited<ReturnType<typeof validateConsent>>;
  try {
    result = await validateConsent(characterRefs, ['likeness', 'voice', 'motion']);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Fails closed under enforce. Unlike the safety half there is no argument for
    // proceeding: an unreachable consent service means an unverified likeness.
    return {
      verdict: 'unavailable',
      wouldHaveRefused: true,
      enforced: mode === 'enforce',
      mode,
      detail:
        `consent validation could not be performed: ${reason}. ` +
        (mode === 'enforce'
          ? 'Refused rather than generating an unverified likeness.'
          : 'Shadow mode: recorded, not enforced.'),
    };
  }

  if (result.valid) {
    return { verdict: 'passed', wouldHaveRefused: false, enforced: false, mode };
  }

  return {
    verdict: 'refused',
    wouldHaveRefused: true,
    enforced: mode === 'enforce',
    mode,
    detail: `missing consents: ${result.missingConsents.join(', ')}`,
  };
}

/**
 * Run both halves. Each is governed by its own mode and reports its own verdict.
 *
 * `allowed` is false only when a half that is ENFORCING refused. A shadowing half
 * never blocks, however loudly it complains.
 */
export async function runPreCheck(
  prompt: string,
  sceneGraph: Record<string, unknown>,
  characterRefs: string[],
  modes: { safety?: CheckMode; consent?: CheckMode } | CheckMode = {},
): Promise<PreCheckResult> {
  // A bare mode string sets BOTH halves — the pre-split call shape, kept so existing
  // tests and callers keep meaning what they meant.
  const resolved =
    typeof modes === 'string'
      ? { safety: modes, consent: modes }
      : { safety: modes.safety ?? safetyMode(), consent: modes.consent ?? consentMode() };

  const [safety, consent] = await Promise.all([
    runSafety(prompt, sceneGraph, resolved.safety),
    runConsent(characterRefs, resolved.consent),
  ]);

  const blocking = [safety, consent].filter((h) => h.enforced && h.wouldHaveRefused);
  const allowed = blocking.length === 0;

  const blockedCategories =
    safety.verdict === 'refused'
      ? (safety.detail ?? '').replace('blocked categories: ', '').split(', ').filter(Boolean)
      : undefined;
  const missingConsents =
    consent.verdict === 'refused'
      ? (consent.detail ?? '').replace('missing consents: ', '').split(', ').filter(Boolean)
      : undefined;

  return {
    allowed,
    safety,
    consent,
    ...(allowed
      ? {}
      : {
          blockedReason:
            'Pre-generation check refused this job. ' +
            blocking.map((h) => h.detail ?? 'refused').join('; '),
        }),
    wouldHaveRefused: safety.wouldHaveRefused || consent.wouldHaveRefused,
    ...(blockedCategories?.length ? { blockedCategories } : {}),
    ...(missingConsents?.length ? { missingConsents } : {}),
  };
}
