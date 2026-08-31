import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runMarketingComplianceGate,
  extractScannableText,
  UNCHECKED_SURFACES,
} from '../workers/marketingComplianceGate.js';
import { runGovernancePipeline, GovernanceOrderError } from '../workers/governancePipeline.js';

/* ---------- Mocks ---------- */

vi.mock('../utils/complianceClient.js', async () => {
  // The error class is real — the gate distinguishes it from other failures by
  // instance, so a stubbed shape would let a broken narrowing pass the test.
  const actual = await vi.importActual<typeof import('../utils/complianceClient.js')>(
    '../utils/complianceClient.js',
  );
  return {
    ...actual,
    scanScript: vi.fn(),
  };
});

vi.mock('../utils/governanceClient.js', () => ({
  moderateContent: vi.fn(),
  validateConsent: vi.fn(),
  signC2PA: vi.fn(),
  embedWatermark: vi.fn(),
  preCheckSafety: vi.fn(),
}));

import { scanScript, ComplianceUnavailableError } from '../utils/complianceClient.js';
import {
  moderateContent,
  validateConsent,
  signC2PA,
  embedWatermark,
} from '../utils/governanceClient.js';

const mockScan = vi.mocked(scanScript);
const mockModerate = vi.mocked(moderateContent);
const mockConsent = vi.mocked(validateConsent);
const mockSign = vi.mocked(signC2PA);
const mockWatermark = vi.mocked(embedWatermark);

beforeEach(() => {
  vi.clearAllMocks();
});

/* ---------- 1.6 — a banned claim must be refused ---------- */

describe('Marketing compliance gate — the refusal that matters', () => {
  it('REFUSES a script promising a guaranteed APR, before any render happens', async () => {
    // Exactly the case from the finding: a video script carrying a rate claim.
    // Under the old pipeline this reached render and was then C2PA-signed.
    mockScan.mockResolvedValue({
      scanId: 'scan-001',
      approved: false,
      riskScore: 100,
      riskLevel: 'critical',
      violations: [
        {
          claimId: 'banned-020',
          category: 'rate_or_term_claim',
          label: 'Permanent zero-rate claim',
          evidence: 'you get 0% APR forever on every',
          position: 42,
          severityWeight: 10,
          legalCitation: 'TILA 15 U.S.C. § 1601; Regulation Z 12 C.F.R. § 1026.16 (trigger terms)',
        },
        {
          claimId: 'banned-001',
          category: 'guaranteed_approval',
          label: 'Guaranteed approval claim',
          evidence: 'guaranteed approval for your business',
          position: 8,
          severityWeight: 10,
          legalCitation: 'FTC Act § 5; Dodd-Frank § 1031 (UDAAP)',
        },
      ],
      summary: 'CRITICAL risk (100/100). 2 banned claim(s) detected.',
    });

    const result = await runMarketingComplianceGate({
      projectId: 'proj-1',
      userId: 'user-1',
      prompt:
        'Narrator: guaranteed approval for your business — you get 0% APR forever on every card.',
    }, 'video');

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('refused this script before render');
    expect(result.blockedReason).toContain('Permanent zero-rate claim');
    expect(result.blockedReason).toContain('Regulation Z');
    expect(result.blockedReason).toContain('Guaranteed approval claim');
    expect(result.scan?.riskScore).toBe(100);
  });

  it('allows a script the scanner cleared, and records what was scanned', async () => {
    mockScan.mockResolvedValue({
      scanId: 'scan-002',
      approved: true,
      riskScore: 0,
      riskLevel: 'clean',
      violations: [],
      summary: 'Communication is compliant. No banned claims detected.',
    });

    const result = await runMarketingComplianceGate({
      projectId: 'proj-1',
      prompt: 'Narrator: we help business owners understand their financing options.',
    }, 'video');

    expect(result.allowed).toBe(true);
    expect(result.scannedFields).toContain('params.prompt');
    expect(result.scannedCharacters).toBeGreaterThan(0);
  });

  it('scans a compliant rate disclosure without tripping — the false-positive case', async () => {
    // "0% intro APR for 12 months, then 18.99% variable" is the COMPLIANT
    // framing. It must reach the scanner intact rather than being pre-filtered,
    // so this asserts the text arrives whole; the phrase-level judgement is
    // CapitalForge's, not the gate's.
    mockScan.mockResolvedValue({
      scanId: 'scan-003',
      approved: true,
      riskScore: 0,
      riskLevel: 'clean',
      violations: [],
      summary: 'Communication is compliant. No banned claims detected.',
    });

    const script = '0% intro APR for 12 months, then the standard variable rate of 18.99%.';
    const result = await runMarketingComplianceGate({ prompt: script }, 'video');

    expect(result.allowed).toBe(true);
    expect(mockScan).toHaveBeenCalledWith(expect.stringContaining(script), 'video_script');
  });
});

/* ---------- 1.4 — fail closed ---------- */

describe('Marketing compliance gate — fails closed', () => {
  it('REFUSES the render when the scanner is unreachable', async () => {
    mockScan.mockRejectedValue(
      new ComplianceUnavailableError('scanner unreachable after 3 attempts (ECONNREFUSED)'),
    );

    const result = await runMarketingComplianceGate(
      { prompt: 'A perfectly ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('could not be performed');
    expect(result.blockedReason).toContain('refused rather than proceeding unchecked');
  });

  it('REFUSES the render when the scanner is not configured', async () => {
    mockScan.mockRejectedValue(
      new ComplianceUnavailableError('not configured (missing COMPLIANCE_SCAN_URL)'),
    );

    const result = await runMarketingComplianceGate(
      { prompt: 'A perfectly ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('COMPLIANCE_SCAN_URL');
  });

  it('REFUSES on an unexpected error rather than letting it read as a pass', async () => {
    mockScan.mockRejectedValue(new TypeError('fetch is not defined'));

    const result = await runMarketingComplianceGate(
      { prompt: 'A perfectly ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('could not be performed');
  });

  it('REFUSES a job with no scannable text rather than reporting it clean', async () => {
    const result = await runMarketingComplianceGate(
      {
        projectId: 'proj-1',
        userId: 'user-1',
        imageUrl: 'https://cdn.animaforge.io/in/x.png',
      },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.verdict).toBe('could_not_scan');
    expect(result.blockedReason).toContain('nothing to check');
    expect(mockScan).not.toHaveBeenCalled();
  });

  it('does NOT refuse an image-only job, and does not call it clean either', async () => {
    // avatar / style_clone / img_to_cartoon transform supplied images and have
    // no script. Refusing them would break a path that cannot make a written
    // claim; reporting them clean would assert a check that never happened.
    const result = await runMarketingComplianceGate(
      { imageUrl: 'https://cdn.animaforge.io/in/x.png' },
      'img_to_cartoon',
    );

    expect(result.allowed).toBe(true);
    expect(result.verdict).toBe('not_applicable');
    expect(result.notApplicableReason).toContain('carries no script');
    expect(result.notApplicableReason).toContain('claims_inside_a_source_image');
    expect(mockScan).not.toHaveBeenCalled();
  });
});

/* ---------- Text extraction ---------- */

describe('Script extraction', () => {
  it('reaches dialogue nested in a scene graph, and names the path', () => {
    const { content, fields } = extractScannableText({
      prompt: 'A founder in an office.',
      sceneGraph: {
        shots: [
          { id: 'shot-1', dialogue: 'We can fix your credit in thirty days.' },
          { id: 'shot-2', caption: 'Apply today' },
        ],
      },
    });

    expect(content).toContain('fix your credit');
    expect(fields).toContain('params.sceneGraph.shots[0].dialogue');
  });

  it('skips identifiers and URLs, which are references rather than claims', () => {
    const { fields } = extractScannableText({
      projectId: 'proj-1',
      userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      imageUrl: 'https://cdn.animaforge.io/in/x.png',
      resolution: '1920x1080',
      prompt: 'A founder in an office.',
    });

    expect(fields).toEqual(['params.prompt']);
  });

  it('scans keys nobody anticipated — the direction of the default matters', () => {
    // An allow-list of known text fields would miss this. The denylist is
    // deliberately the other way round.
    const { content } = extractScannableText({
      someFieldAddedNextQuarter: 'Guaranteed approval, no risk at all.',
    });

    expect(content).toContain('Guaranteed approval');
  });
});

/* ---------- 1.5 — honest about coverage ---------- */

describe('Coverage is declared, not assumed', () => {
  it('reports every unchecked surface on a passing result', async () => {
    mockScan.mockResolvedValue({
      scanId: 'scan-004',
      approved: true,
      riskScore: 0,
      riskLevel: 'clean',
      violations: [],
      summary: 'clean',
    });

    const result = await runMarketingComplianceGate({ prompt: 'An ordinary script.' }, 'video');

    expect(result.allowed).toBe(true);
    expect(result.verdict).toBe('scanned_clean');
    const surfaces = result.uncheckedSurfaces.map((s) => s.surface);
    expect(surfaces).toContain('on_screen_text_added_at_render');
    expect(surfaces).toContain('voiceover_diverging_from_script');
    expect(surfaces).toContain('claims_inside_a_source_image');
    expect(surfaces).toContain('non_english_script_text');
  });

  it('marks every listed surface as actually possible in this pipeline', () => {
    // A surface listed as impossible would be a claim about the pipeline, and
    // an untrue one would quietly narrow the declared gap.
    for (const s of UNCHECKED_SURFACES) {
      expect(s.possible).toBe(true);
      expect(s.detail.length).toBeGreaterThan(40);
    }
  });
});

/* ---------- 1.3 — nothing is signed until it passes ---------- */

describe('Governance ordering is a precondition, not a convention', () => {
  beforeEach(() => {
    mockSign.mockResolvedValue({
      manifestId: 'm-1',
      signature: 'sig',
      signedAt: '2026-08-30T00:00:00Z',
    });
    mockWatermark.mockResolvedValue({ watermarkId: 'wm-1', embeddedAt: '2026-08-30T00:00:00Z' });
  });

  it('does not sign when moderation blocks', async () => {
    mockModerate.mockResolvedValue({
      allowed: false,
      categories: ['violence'],
      confidence: 0.9,
      jobId: 'j-1',
    });
    mockConsent.mockResolvedValue({ valid: true, missingConsents: [] });

    const result = await runGovernancePipeline({
      jobId: 'j-1',
      outputUrl: 'https://cdn.animaforge.io/out/a.mp4',
      contentType: 'video',
      characterRefs: [],
      consentTypes: ['likeness'],
      metadata: {},
    });

    expect(result.passed).toBe(false);
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockWatermark).not.toHaveBeenCalled();
  });

  it('does not sign when consent fails, even though moderation passed', async () => {
    mockModerate.mockResolvedValue({ allowed: true, categories: [], confidence: 1, jobId: 'j-2' });
    mockConsent.mockResolvedValue({ valid: false, missingConsents: ['voice'] });

    const result = await runGovernancePipeline({
      jobId: 'j-2',
      outputUrl: 'https://cdn.animaforge.io/out/b.mp4',
      contentType: 'video',
      characterRefs: ['c-1'],
      consentTypes: ['voice'],
      metadata: {},
    });

    expect(result.passed).toBe(false);
    expect(mockSign).not.toHaveBeenCalled();
  });

  it('exposes GovernanceOrderError so a future reorder fails loudly', () => {
    // The assertion cannot fire in the current ordering. This confirms the
    // guard is real and carries a message that says what went wrong, so it is
    // not silently deleted as dead code later.
    const err = new GovernanceOrderError('C2PA signing', ['content moderation']);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('was reached before content moderation passed');
    expect(err.message).toContain('worse than leaving it unsigned');
  });
});
