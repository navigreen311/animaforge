import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runPreCheck,
  safetyMode,
  consentMode,
} from '../workers/preGenerationCheck.js';

vi.mock('../utils/governanceClient.js', () => ({
  preCheckSafety: vi.fn(),
  validateConsent: vi.fn(),
  moderateContent: vi.fn(),
  signC2PA: vi.fn(),
  embedWatermark: vi.fn(),
}));

import { preCheckSafety, validateConsent } from '../utils/governanceClient.js';

const mockSafety = vi.mocked(preCheckSafety);
const mockConsent = vi.mocked(validateConsent);

const originalSafety = process.env.PRECHECK_MODE;
const originalConsent = process.env.CONSENT_MODE;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PRECHECK_MODE;
  delete process.env.CONSENT_MODE;
  mockSafety.mockResolvedValue({ safe: true, blockedCategories: [] });
  mockConsent.mockResolvedValue({ valid: true, missingConsents: [] });
});

afterEach(() => {
  if (originalSafety === undefined) delete process.env.PRECHECK_MODE;
  else process.env.PRECHECK_MODE = originalSafety;
  if (originalConsent === undefined) delete process.env.CONSENT_MODE;
  else process.env.CONSENT_MODE = originalConsent;
});

describe('Mode selection — opposite defaults, for opposite reasons', () => {
  it('safety defaults to shadow', () => {
    expect(safetyMode()).toBe('shadow');
  });

  it('consent defaults to ENFORCE', () => {
    // A missing likeness consent is a fact, not a keyword match. There is nothing to
    // measure first.
    expect(consentMode()).toBe('enforce');
  });

  it('a typo in the safety mode resolves to shadow, never to enforce', () => {
    process.env.PRECHECK_MODE = 'enfroce';
    expect(safetyMode()).toBe('shadow');
  });

  it('a typo in the consent mode resolves to enforce, never to shadow', () => {
    // The opposite safe direction: a typo must not silently stop enforcing a control
    // that has no false positives.
    process.env.CONSENT_MODE = 'shadwo';
    expect(consentMode()).toBe('enforce');
  });

  it('honours the explicit values on both', () => {
    process.env.PRECHECK_MODE = 'enforce';
    process.env.CONSENT_MODE = 'off';
    expect(safetyMode()).toBe('enforce');
    expect(consentMode()).toBe('off');
  });
});

describe('The halves are governed separately', () => {
  it('consent refuses while safety only records — the default posture', async () => {
    mockSafety.mockResolvedValue({ safe: false, blockedCategories: ['violence'] });
    mockConsent.mockResolvedValue({ valid: false, missingConsents: ['likeness'] });

    const r = await runPreCheck('shoot the interview', {}, ['char-1']);

    expect(r.allowed).toBe(false);
    expect(r.consent.enforced).toBe(true);
    expect(r.consent.verdict).toBe('refused');
    expect(r.safety.enforced).toBe(false);
    expect(r.safety.verdict).toBe('refused');
    // The refusal names the consent, not the keyword.
    expect(r.blockedReason).toContain('missing consents');
    expect(r.blockedReason).not.toContain('blocked categories');
  });

  it('a safety hit alone does not block', async () => {
    mockSafety.mockResolvedValue({ safe: false, blockedCategories: ['violence'] });

    const r = await runPreCheck('shoot the interview', {}, ['char-1']);

    expect(r.allowed).toBe(true);
    expect(r.safety.wouldHaveRefused).toBe(true);
    expect(r.consent.verdict).toBe('passed');
  });

  it('a job declaring no characters is not_applicable, never passed', async () => {
    // The hole, named rather than hidden: consent enforcement is bypassed by not
    // declaring. All twelve seeded shots look exactly like this.
    const r = await runPreCheck('Rosie the Fox meets the Oak Guardian', {}, []);

    expect(r.allowed).toBe(true);
    expect(r.consent.verdict).toBe('not_applicable');
    expect(r.consent.detail).toContain('no characterRefs declared');
    expect(mockConsent).not.toHaveBeenCalled();
  });

  it('consent fails closed when its service is unreachable', async () => {
    mockConsent.mockRejectedValue(new Error('ECONNREFUSED'));

    const r = await runPreCheck('anything', {}, ['char-1']);

    expect(r.allowed).toBe(false);
    expect(r.consent.verdict).toBe('unavailable');
    expect(r.blockedReason).toContain('unverified likeness');
  });

  it('an unreachable SAFETY service does not block, because safety shadows', async () => {
    mockSafety.mockRejectedValue(new Error('ECONNREFUSED'));

    const r = await runPreCheck('anything', {}, ['char-1']);

    expect(r.allowed).toBe(true);
    expect(r.safety.verdict).toBe('unavailable');
    expect(r.safety.enforced).toBe(false);
  });
});

describe('Shadow mode — records without refusing', () => {
  it('allows a job the classifier flagged, and says it would have refused', async () => {
    mockSafety.mockResolvedValue({ safe: false, blockedCategories: ['violence'] });

    const r = await runPreCheck('Establishing shot of the harbour.', {}, [], 'shadow');

    expect(r.allowed).toBe(true);
    expect(r.wouldHaveRefused).toBe(true);
    expect(r.blockedCategories).toEqual(['violence']);
    expect(r.safety.mode).toBe('shadow');
  });

  it('keeps allowed and wouldHaveRefused as separate answers', async () => {
    // The whole point of shadow mode is that these two disagree. A reader checking
    // only `allowed` would record a clean pass for a prompt the filter flagged.
    mockConsent.mockResolvedValue({ valid: false, missingConsents: ['likeness'] });

    const r = await runPreCheck('anything', {}, ['char-1'], 'shadow');

    expect(r.allowed).toBe(true);
    expect(r.wouldHaveRefused).toBe(true);
    expect(r.missingConsents).toEqual(['likeness']);
  });

  it('does not block when the moderation service is unreachable', async () => {
    mockSafety.mockRejectedValue(new Error('ECONNREFUSED'));

    const r = await runPreCheck('anything', {}, [], 'shadow');

    expect(r.allowed).toBe(true);
    expect(r.wouldHaveRefused).toBe(true);
    expect(r.safety.verdict).toBe('unavailable');
    expect(r.safety.detail).toContain('Shadow mode');
  });

  it('reports a clean prompt as clean', async () => {
    const r = await runPreCheck('A calm lake at sunrise.', {}, [], 'shadow');
    expect(r.allowed).toBe(true);
    expect(r.wouldHaveRefused).toBe(false);
  });
});

describe('Enforce mode — refuses', () => {
  it('refuses a flagged prompt', async () => {
    mockSafety.mockResolvedValue({ safe: false, blockedCategories: ['violence'] });

    const r = await runPreCheck('anything', {}, [], 'enforce');

    expect(r.allowed).toBe(false);
    expect(r.wouldHaveRefused).toBe(true);
  });

  it('refuses a job with a missing consent', async () => {
    mockConsent.mockResolvedValue({ valid: false, missingConsents: ['voice'] });

    const r = await runPreCheck('anything', {}, ['char-1'], 'enforce');

    expect(r.allowed).toBe(false);
  });

  it('fails closed when the check cannot be performed', async () => {
    mockSafety.mockRejectedValue(new Error('ECONNREFUSED'));

    const r = await runPreCheck('anything', {}, [], 'enforce');

    expect(r.allowed).toBe(false);
    expect(r.safety.detail).toContain('Refused rather than proceeding unchecked');
  });
});

describe('Off mode', () => {
  it('does not call the services at all', async () => {
    const r = await runPreCheck('anything', {}, [], 'off');

    expect(r.allowed).toBe(true);
    expect(r.wouldHaveRefused).toBe(false);
    expect(mockSafety).not.toHaveBeenCalled();
    expect(mockConsent).not.toHaveBeenCalled();
  });
});
