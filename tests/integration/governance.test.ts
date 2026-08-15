/**
 * Integration tests — Governance APIs
 *
 * Tests moderation, consent, C2PA signing/verification, and watermark
 * services through their Express apps with in-memory fallback stores.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser } from './helpers';
import { _resetLogStore } from '../../services/governance/moderation/src/services/moderationService';
import { clearStore as clearConsentStore } from '../../services/governance/consent/src/services/consentService';
import { clearStore as clearC2paStore } from '../../services/governance/c2pa/src/services/c2paService';
import { clearStore as clearWatermarkStore } from '../../services/governance/watermark/src/services/watermarkService';

let moderationApp: any;
let consentApp: any;
let c2paApp: any;
let watermarkApp: any;

async function getModerationApp() {
  if (!moderationApp) {
    const mod = await import('../../services/governance/moderation/src/index');
    moderationApp = (mod as any).app ?? mod.default;
  }
  return moderationApp;
}

async function getConsentApp() {
  if (!consentApp) {
    const mod = await import('../../services/governance/consent/src/index');
    consentApp = (mod as any).app ?? mod.default;
  }
  return consentApp;
}

async function getC2paApp() {
  if (!c2paApp) {
    const mod = await import('../../services/governance/c2pa/src/index');
    c2paApp = (mod as any).app ?? mod.default;
  }
  return c2paApp;
}

async function getWatermarkApp() {
  if (!watermarkApp) {
    const mod = await import('../../services/governance/watermark/src/index');
    watermarkApp = (mod as any).app ?? mod.default;
  }
  return watermarkApp;
}

// Reset in-memory stores before each test
beforeEach(() => {
  _resetLogStore();
  clearConsentStore();
  clearC2paStore();
  clearWatermarkStore();
});

describe('Governance — Moderation', () => {
  // 1. Moderate safe content -> pass
  it('should pass moderation for safe content', async () => {
    const app = await getModerationApp();

    const res = await request(app)
      .post('/governance/moderate')
      .send({
        job_id: uuidv4(),
        content_url: 'https://cdn.example.com/assets/beautiful-sunset.mp4',
        content_type: 'video',
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('pass');
    expect(res.body.category).toBe('safe');
    expect(res.body.score).toBe(0);
  });

  // 2. Moderate unsafe content -> block with reason
  it('should block moderation for unsafe content', async () => {
    const app = await getModerationApp();

    const res = await request(app)
      .post('/governance/moderate')
      .send({
        job_id: uuidv4(),
        content_url: 'https://cdn.example.com/assets/murder-gore-weapon.mp4',
        content_type: 'video',
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('block');
    expect(res.body.category).toBe('violence');
    expect(res.body.score).toBeGreaterThan(0);
    expect(res.body.details).toContain('violence');
  });
});

describe('Governance — Consent', () => {
  // 3. Grant consent -> consent record created
  it('should grant consent and return a consent record', async () => {
    const app = await getConsentApp();
    const subjectId = uuidv4();

    const res = await request(app)
      .post('/api/v1/rights/consent')
      .send({
        subject_id: subjectId,
        granted_by: uuidv4(),
        consent_type: 'likeness',
        scope: ['generation', 'distribution'],
        expires_at: null,
      });

    expect(res.status).toBe(201);
    expect(res.body.consent_id).toBeDefined();
    expect(res.body.status).toBe('active');
  });

  // 4. Revoke consent -> revokedAt set
  it('should revoke consent and set revoked status', async () => {
    const app = await getConsentApp();
    const subjectId = uuidv4();

    // Grant first
    const grantRes = await request(app)
      .post('/api/v1/rights/consent')
      .send({
        subject_id: subjectId,
        granted_by: uuidv4(),
        consent_type: 'likeness',
        scope: ['generation'],
        expires_at: null,
      });

    const consentId = grantRes.body.consent_id;

    // Revoke
    const res = await request(app).delete(`/api/v1/rights/consent/${consentId}`);

    expect(res.status).toBe(200);
    expect(res.body.consent_id).toBe(consentId);
    expect(res.body.status).toBe('revoked');
  });

  // 5. Validate consent -> authorized
  it('should validate consent and confirm authorization', async () => {
    const app = await getConsentApp();
    const subjectId = uuidv4();

    // Grant consent for 'likeness'
    await request(app)
      .post('/api/v1/rights/consent')
      .send({
        subject_id: subjectId,
        granted_by: uuidv4(),
        consent_type: 'likeness',
        scope: ['generation'],
        expires_at: null,
      });

    // Validate
    const res = await request(app)
      .post('/governance/consent/validate')
      .send({
        character_refs: [subjectId],
        consent_types_needed: ['likeness'],
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.missing_consents).toHaveLength(0);
  });
});

describe('Governance — C2PA', () => {
  // 6. Sign C2PA manifest -> valid manifest returned
  it('should sign a C2PA manifest and return valid data', async () => {
    const app = await getC2paApp();
    const jobId = uuidv4();

    const res = await request(app)
      .post('/governance/c2pa/sign')
      .send({
        job_id: jobId,
        project_id: uuidv4(),
        shot_id: uuidv4(),
        model_id: 'animaforge-gen-v2',
        input_hash: 'abc123def456',
        output_url: 'https://cdn.example.com/output/video.mp4',
        user_id: uuidv4(),
        consent_ids: [uuidv4()],
      });

    expect(res.status).toBe(201);
    expect(res.body.manifest).toBeDefined();
    expect(res.body.output_id).toBeDefined();
    expect(res.body.manifest.claim_generator).toContain('AnimaForge');
    expect(res.body.manifest.assertions.map((a: { label: string }) => a.label)).toContain(
      'c2pa.actions',
    );
    // No signing certificate is configured in this environment, so the service
    // must record the claim as unsigned rather than inventing a signature.
    expect(res.body.signed).toBe(false);
    expect(res.body.signature).toBeNull();
    expect(res.body.degraded).toBe(true);
  });

  // 7. Verify C2PA -> reports the record without claiming it is validated
  it('should report an unsigned C2PA record as unverified, never as valid', async () => {
    const app = await getC2paApp();
    const jobId = uuidv4();

    // Sign first
    const signRes = await request(app)
      .post('/governance/c2pa/sign')
      .send({
        job_id: jobId,
        project_id: uuidv4(),
        shot_id: uuidv4(),
        model_id: 'animaforge-gen-v2',
        input_hash: 'abc123def456',
        output_url: 'https://cdn.example.com/output/video.mp4',
        user_id: uuidv4(),
        consent_ids: [uuidv4()],
      });

    const outputId = signRes.body.output_id;

    // Verify
    const res = await request(app).get(`/governance/c2pa/verify/${outputId}`);

    expect(res.status).toBe(200);
    expect(res.body.record_found).toBe(true);
    expect(res.body.generator).toContain('AnimaForge');
    expect(res.body.model_id).toBe('animaforge-gen-v2');
    expect(res.body.created_at).toBeDefined();
    // Without a signing certificate nothing was cryptographically signed, so
    // the honest answer is "unverified" — not "valid".
    expect(res.body.status).toBe('unverified');
    expect(res.body.valid).toBe(false);
    expect(res.body.cryptographically_verified).toBe(false);
  });
});

describe('Governance — Watermark', () => {
  // 8. A URL-only embed registers intent but marks no pixels, and detection
  //    from a URL must not claim a match. Real pixel round-trips (embed →
  //    re-encode → recover) live in
  //    services/governance/watermark/src/__tests__/watermark.test.ts.
  it('should register a URL-only embed without claiming pixels were marked', async () => {
    const app = await getWatermarkApp();
    const jobId = uuidv4();
    const outputUrl = 'https://cdn.example.com/output/scene-42.mp4';

    // Embed
    const embedRes = await request(app)
      .post('/governance/watermark/embed')
      .send({
        job_id: jobId,
        output_url: outputUrl,
        watermark_data: { project: 'test-project', owner: 'test-user' },
      });

    expect(embedRes.status).toBe(201);
    expect(embedRes.body.watermark_id).toBeDefined();
    expect(embedRes.body.watermarked_url).toBeDefined();
    expect(embedRes.body.embedded).toBe(false);
    expect(embedRes.body.mode).toBe('registered-only');

    const watermarkedUrl = embedRes.body.watermarked_url;

    // Detect — a URL is not evidence; the watermark lives in the pixels.
    const detectRes = await request(app)
      .post('/governance/watermark/detect')
      .send({ content_url: watermarkedUrl });

    expect(detectRes.status).toBe(200);
    expect(detectRes.body.detected).toBe(false);
    expect(detectRes.body.confidence).toBe(0);
    expect(detectRes.body.metadata).toBeNull();
    expect(detectRes.body.reason).toBeTruthy();
  });
});
