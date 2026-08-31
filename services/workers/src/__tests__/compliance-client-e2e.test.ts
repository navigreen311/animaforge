import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runMarketingComplianceGate } from '../workers/marketingComplianceGate.js';
import { scanScript, ComplianceUnavailableError } from '../utils/complianceClient.js';

/**
 * End-to-end refusal, over real HTTP, with no mock of the client.
 *
 * The sibling test file mocks `scanScript` to exercise the gate's branches.
 * This one does not: it stands up a server that behaves the way CapitalForge's
 * `POST /api/comm-compliance/scan` behaves, and drives the real `fetch` client
 * through it. What is being proved here is the wiring — headers, body shape,
 * verdict parsing, refusal — because a gate that is correct in isolation and
 * mis-wired to the scanner refuses nothing at all and looks fine doing it.
 *
 * The patterns below are copied from CapitalForge's BANNED_CLAIMS *only* so
 * this fixture answers the way the real service would. They are asserted
 * against the real list in
 * `capitalforge/tests/unit/services/comm-compliance-marketing-surface.test.ts`;
 * this file is about transport, not about which phrases are banned.
 */

interface StubClaim {
  claimId: string;
  category: string;
  label: string;
  pattern: RegExp;
  severityWeight: number;
  legalCitation: string;
}

const STUB_CLAIMS: StubClaim[] = [
  {
    claimId: 'banned-001',
    category: 'guaranteed_approval',
    label: 'Guaranteed approval claim',
    pattern: /guaranteed?\s+(approval|credit|funding|limit)/i,
    severityWeight: 10,
    legalCitation: 'FTC Act § 5; Dodd-Frank § 1031 (UDAAP)',
  },
  {
    claimId: 'banned-020',
    category: 'rate_or_term_claim',
    label: 'Permanent zero-rate claim',
    pattern:
      /(0|zero)\s*%?\s*(apr|interest|rate)\s+(forever|for life|permanently|always|guaranteed)/i,
    severityWeight: 10,
    legalCitation: 'TILA 15 U.S.C. § 1601; Regulation Z 12 C.F.R. § 1026.16 (trigger terms)',
  },
  {
    claimId: 'banned-025',
    category: 'credit_improvement_claim',
    label: 'Credit repair representation',
    pattern: /(fix|repair|restore|rebuild|boost|raise)\s+your\s+credit\b/i,
    severityWeight: 10,
    legalCitation: 'CROA 15 U.S.C. § 1679a(3), § 1679b(a)',
  },
];

const TOKEN = 'test-tenant-token';
const ADVISOR = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

let server: Server;
let baseUrl: string;
/** Bodies the server actually received, so the request shape can be asserted. */
const received: { auth: string | undefined; body: Record<string, unknown> }[] = [];
/** Flip to make the stub behave like a service that is down. */
let mode: 'ok' | 'error_500' | 'unauthorized' = 'ok';

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}') as Record<string, unknown>;
      received.push({ auth: req.headers.authorization, body });

      if (mode === 'error_500') {
        res.writeHead(500).end('upstream failure');
        return;
      }
      if (mode === 'unauthorized' || req.headers.authorization !== `Bearer ${TOKEN}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: { code: 'AUTH_TOKEN_MISSING' } }));
        return;
      }

      const content = String(body.content ?? '');
      const violations = STUB_CLAIMS.filter((c) => c.pattern.test(content)).map((c) => {
        const m = c.pattern.exec(content)!;
        return {
          claimId: c.claimId,
          category: c.category,
          label: c.label,
          evidence: content.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20).trim(),
          position: m.index,
          severityWeight: c.severityWeight,
          legalCitation: c.legalCitation,
        };
      });

      const riskScore = Math.min(100, violations.reduce((s, v) => s + v.severityWeight * 5, 0));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: {
            scanId: 'scan-e2e',
            tenantId: 'tenant-1',
            advisorId: body.advisorId,
            channel: body.channel,
            riskScore,
            riskLevel: riskScore === 0 ? 'clean' : riskScore <= 45 ? 'medium' : 'critical',
            violations,
            requiredDisclosures: [],
            contentWithDisclosures: content,
            approved: riskScore === 0,
            summary:
              violations.length === 0
                ? 'Communication is compliant. No banned claims detected.'
                : `${violations.length} banned claim(s) detected.`,
            scannedAt: new Date().toISOString(),
          },
        }),
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api/comm-compliance/scan`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  received.length = 0;
  mode = 'ok';
  process.env.COMPLIANCE_SCAN_URL = baseUrl;
  process.env.COMPLIANCE_SCAN_TOKEN = TOKEN;
  process.env.COMPLIANCE_SCAN_ADVISOR_ID = ADVISOR;
});

describe('End-to-end: a banned claim is refused over real HTTP', () => {
  it('REFUSES a generation job whose script promises a guaranteed APR', async () => {
    const result = await runMarketingComplianceGate({
      projectId: 'proj-1',
      userId: 'user-1',
      prompt:
        'Narrator: Guaranteed approval for your business. You get 0% APR forever, and we ' +
        'fix your credit along the way.',
      sceneGraph: { shots: [{ id: 'shot-1', caption: 'Apply in minutes' }] },
    }, 'video');

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('refused this script before render');
    expect(result.scan?.approved).toBe(false);
    expect(result.scan?.riskScore).toBe(100);

    const categories = result.scan!.violations.map((v) => v.category);
    expect(categories).toContain('guaranteed_approval');
    expect(categories).toContain('rate_or_term_claim');
    expect(categories).toContain('credit_improvement_claim');

    // The refusal names the law, because that is what makes it actionable.
    expect(result.blockedReason).toContain('Regulation Z');
    expect(result.blockedReason).toContain('CROA');
  });

  it('sends the credential and the honest channel name', async () => {
    // Makes its own call: `received` is cleared between tests, so asserting on
    // the previous test's request would pass or fail depending on ordering.
    await runMarketingComplianceGate({ prompt: 'An entirely ordinary script.' }, 'video');

    expect(received).toHaveLength(1);
    expect(received[0]!.auth).toBe(`Bearer ${TOKEN}`);
    // `video_script` and not `video`: nothing here has inspected a video.
    expect(received[0]!.body.channel).toBe('video_script');
    expect(received[0]!.body.advisorId).toBe(ADVISOR);
  });

  it('ALLOWS a script with a complete Regulation Z disclosure', async () => {
    const result = await runMarketingComplianceGate({
      prompt:
        'Narrator: 0% intro APR for 12 months, then the standard variable rate. ' +
        'Approval depends on your credit profile.',
    }, 'video');

    expect(result.allowed).toBe(true);
    expect(result.scan?.riskScore).toBe(0);
  });

  it('reaches a claim buried in the scene graph, not only the top-level prompt', async () => {
    const result = await runMarketingComplianceGate({
      prompt: 'A founder walking through a warehouse.',
      sceneGraph: {
        shots: [
          { id: 'shot-1', caption: 'Financing that fits' },
          { id: 'shot-2', dialogue: 'And we fix your credit while we do it.' },
        ],
      },
    }, 'video');

    expect(result.allowed).toBe(false);
    expect(result.scan?.violations.map((v) => v.category)).toContain('credit_improvement_claim');
    expect(result.scannedFields).toContain('params.sceneGraph.shots[1].dialogue');
  });
});

describe('End-to-end: fail closed', () => {
  it('REFUSES when the scanner returns 500 on every attempt', async () => {
    mode = 'error_500';

    const result = await runMarketingComplianceGate(
      { prompt: 'An entirely ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('unreachable after 3 attempts');
    expect(received.length).toBe(3); // retried, then refused
  }, 15_000);

  it('REFUSES on a 401 without retrying — a bad credential will not improve', async () => {
    process.env.COMPLIANCE_SCAN_TOKEN = 'wrong-token';

    const result = await runMarketingComplianceGate(
      { prompt: 'An entirely ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('HTTP 401');
    expect(received.length).toBe(1);
  });

  it('REFUSES when the scanner is not configured at all', async () => {
    delete process.env.COMPLIANCE_SCAN_URL;

    const result = await runMarketingComplianceGate(
      { prompt: 'An entirely ordinary script.' },
      'video',
    );

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toContain('COMPLIANCE_SCAN_URL');
    expect(received.length).toBe(0);
  });

  it('never returns approved:true from an unparseable body', async () => {
    // A verdict this client cannot read is not a pass. The scanner is the only
    // thing permitted to say "approved", and it has to say it in those terms.
    process.env.COMPLIANCE_SCAN_URL = baseUrl.replace('/api/comm-compliance/scan', '/nope');
    const bad = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { scanId: 'x' } }));
    });
    await new Promise<void>((r) => bad.listen(0, '127.0.0.1', r));
    process.env.COMPLIANCE_SCAN_URL = `http://127.0.0.1:${(bad.address() as AddressInfo).port}/scan`;

    await expect(scanScript('anything at all')).rejects.toBeInstanceOf(ComplianceUnavailableError);

    await new Promise<void>((r) => bad.close(() => r()));
  });
});
