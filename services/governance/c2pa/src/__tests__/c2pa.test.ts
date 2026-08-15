/**
 * C2PA service tests.
 *
 * The suite deliberately covers BOTH paths and asserts different things about
 * each: the real path must produce a manifest the library can cryptographically
 * validate, and the degraded path must refuse to claim it did.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Jimp } from 'jimp';
import app from '../index';
import { clearStore } from '../services/c2paService';
import { resetBackend } from '../lib/c2paBackend';
import { c2paNodeAvailable, findOpenssl, startTestPki } from './helpers/testPki';
import type { TestPki } from './helpers/testPki';

/** A JPEG with real structure — a flat colour compresses to almost nothing. */
async function makeJpeg(width = 320, height = 240): Promise<Buffer> {
  const image = new Jimp({ width, height, color: 0x102030ff });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.bitmap.data[i] = (x * 7) % 256;
      image.bitmap.data[i + 1] = (y * 11) % 256;
      image.bitmap.data[i + 2] = (x ^ y) % 256;
      image.bitmap.data[i + 3] = 255;
    }
  }
  return Buffer.from(await image.getBuffer('image/jpeg', { quality: 90 }));
}

function signBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    job_id: randomUUID(),
    project_id: randomUUID(),
    shot_id: randomUUID(),
    model_id: 'animaforge-gen-v2',
    input_hash: 'abc123def456',
    user_id: randomUUID(),
    consent_ids: [randomUUID()],
    output_url: 'https://cdn.animaforge.com/output/video-001.mp4',
    ...extra,
  };
}

/* ================================================================== */
/*  Degraded path — no signing credentials                            */
/* ================================================================== */

describe('C2PA — degraded mode (no signing credentials)', () => {
  const saved = {
    cert: process.env.C2PA_SIGNING_CERT,
    key: process.env.C2PA_PRIVATE_KEY,
  };

  beforeEach(() => {
    delete process.env.C2PA_SIGNING_CERT;
    delete process.env.C2PA_PRIVATE_KEY;
    resetBackend();
    clearStore();
  });

  afterAll(() => {
    if (saved.cert) process.env.C2PA_SIGNING_CERT = saved.cert;
    if (saved.key) process.env.C2PA_PRIVATE_KEY = saved.key;
    resetBackend();
  });

  it('reports itself as degraded through the capability endpoint', async () => {
    const res = await request(app).get('/governance/c2pa/capabilities');

    expect(res.status).toBe(200);
    expect(res.body.signing.available).toBe(false);
    expect(res.body.signing.credentials_present).toBe(false);
    expect(res.body.degraded).toBe(true);
    expect(res.body.degraded_reasons.join(' ')).toMatch(/C2PA_SIGNING_CERT/);
  });

  it('reports degraded through /health/detailed', async () => {
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.capabilities.signing.available).toBe(false);
  });

  it('records provenance but marks it unsigned and unembedded', async () => {
    const res = await request(app).post('/governance/c2pa/sign').send(signBody());

    expect(res.status).toBe(201);
    expect(res.body.mode).toBe('degraded');
    expect(res.body.signed).toBe(false);
    expect(res.body.embedded).toBe(false);
    expect(res.body.degraded).toBe(true);
    expect(res.body.signature).toBeNull();
    expect(res.body.warning).toMatch(/DEGRADED MODE/);
    // The old hard-coded HMAC fallback must be gone for good.
    expect(JSON.stringify(res.body)).not.toContain('animaforge-c2pa-dev-secret');
  });

  it('never reports a degraded record as valid', async () => {
    const signRes = await request(app).post('/governance/c2pa/sign').send(signBody());
    const res = await request(app).get(`/governance/c2pa/verify/${signRes.body.output_id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('unverified');
    expect(res.body.valid).toBe(false);
    expect(res.body.cryptographically_verified).toBe(false);
    expect(res.body.record_found).toBe(true);
    expect(res.body.reason).toMatch(/no cryptographic signature/);
  });

  it('still validates the request body', async () => {
    const res = await request(app).post('/governance/c2pa/sign').send({ job_id: 'nope' });
    expect(res.status).toBe(400);
  });

  it('404s for an unknown output id', async () => {
    const res = await request(app).get(`/governance/c2pa/verify/${randomUUID()}`);
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('not_found');
  });

  it('exposes the manifest definition it recorded', async () => {
    const body = signBody();
    const signRes = await request(app).post('/governance/c2pa/sign').send(body);
    expect(signRes.status).toBe(201);

    const res = await request(app).get(`/governance/c2pa/manifest/${body.job_id}`);
    expect(res.status).toBe(200);
    expect(res.body.manifest.claim_generator).toContain('AnimaForge');
    const labels = res.body.manifest.assertions.map((a: { label: string }) => a.label);
    expect(labels).toContain('c2pa.actions');
    expect(labels).toContain('com.animaforge.generation');
  });

  it('does not put the raw user id in the manifest', async () => {
    const body = signBody();
    const res = await request(app).post('/governance/c2pa/sign').send(body);
    expect(JSON.stringify(res.body.manifest)).not.toContain(body.user_id as string);
    expect(res.body.user_id_hash).toHaveLength(64);
  });
});

/* ================================================================== */
/*  Real path — genuine certificate chain and local TSA               */
/* ================================================================== */

const opensslPath = findOpenssl();
const c2paLib = c2paNodeAvailable();
const realPathReason = !opensslPath
  ? 'openssl was not found on PATH (set OPENSSL_PATH), so no test certificate chain or RFC 3161 timestamp authority could be created'
  : !c2paLib.available
    ? `the c2pa-node native binding could not be loaded (${c2paLib.error}); it is fetched by the package's postinstall script, so 'npm ci --ignore-scripts' or an offline install will skip it`
    : null;

if (realPathReason) {
  // An explicit, loud skip. Silence here would let the real path rot unnoticed.
  describe.skip(`C2PA — real signing path [SKIPPED: ${realPathReason}]`, () => {
    it('is skipped', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('C2PA — real signing path (COSE-signed, embedded)', () => {
    let pki: TestPki;
    let jpeg: Buffer;
    const saved = {
      cert: process.env.C2PA_SIGNING_CERT,
      key: process.env.C2PA_PRIVATE_KEY,
      tsa: process.env.C2PA_TSA_URL,
    };

    beforeAll(async () => {
      pki = await startTestPki();
      jpeg = await makeJpeg();
      process.env.C2PA_SIGNING_CERT = pki.chainPath;
      process.env.C2PA_PRIVATE_KEY = pki.keyPath;
      process.env.C2PA_TSA_URL = pki.tsaUrl;
      resetBackend();
    }, 120_000);

    afterAll(async () => {
      await pki?.close();
      if (saved.cert) process.env.C2PA_SIGNING_CERT = saved.cert;
      else delete process.env.C2PA_SIGNING_CERT;
      if (saved.key) process.env.C2PA_PRIVATE_KEY = saved.key;
      else delete process.env.C2PA_PRIVATE_KEY;
      if (saved.tsa) process.env.C2PA_TSA_URL = saved.tsa;
      else delete process.env.C2PA_TSA_URL;
      resetBackend();
    });

    afterEach(() => clearStore());

    it('reports signing as available', async () => {
      const res = await request(app).get('/governance/c2pa/capabilities');

      expect(res.body.signing.available).toBe(true);
      expect(res.body.signing.credentials_present).toBe(true);
      expect(res.body.signing.library_available).toBe(true);
      expect(res.body.signing.library).toBe('c2pa-node');
      expect(res.body.signing.timestamp_authority).toBe(pki.tsaUrl);
      // `degraded` also covers unrelated dependencies (a database is not
      // configured in tests), so assert specifically that nothing about
      // signing is degraded.
      const signingReasons = (res.body.degraded_reasons as string[]).filter((r) =>
        /sign|certificate|credential|c2pa-node/i.test(r),
      );
      expect(signingReasons).toEqual([]);
    });

    it('embeds a COSE-signed manifest into the asset bytes', async () => {
      const res = await request(app)
        .post('/governance/c2pa/sign')
        .send(
          signBody({
            asset_base64: jpeg.toString('base64'),
            mime_type: 'image/jpeg',
            output_url: 'https://cdn.animaforge.com/output/still-001.jpg',
          }),
        );

      expect(res.status).toBe(201);
      expect(res.body.mode).toBe('c2pa-embedded');
      expect(res.body.signed).toBe(true);
      expect(res.body.embedded).toBe(true);
      expect(res.body.degraded).toBe(false);
      expect(res.body.signature.algorithm).toBe('Es256');
      expect(res.body.signature.issuer).toContain('AnimaForge Test');
      expect(res.body.signature.cert_serial_number).toBeTruthy();
      // A real RFC 3161 timestamp, from the local TSA.
      expect(res.body.signature.timestamp).toBeTruthy();
      expect(res.body.manifest_label).toContain('animaforge');

      // The manifest travels inside the file, not beside it.
      const signed = Buffer.from(res.body.asset_base64, 'base64');
      expect(signed.length).toBeGreaterThan(jpeg.length);
      expect(signed.includes(Buffer.from('c2pa'))).toBe(true);
      expect(res.body.signed_asset_sha256).toHaveLength(64);
    }, 120_000);

    it('cryptographically verifies the signed asset it produced', async () => {
      const signRes = await request(app)
        .post('/governance/c2pa/sign')
        .send(
          signBody({
            asset_base64: jpeg.toString('base64'),
            mime_type: 'image/jpeg',
          }),
        );

      const res = await request(app).post('/governance/c2pa/verify').send({
        asset_base64: signRes.body.asset_base64,
        mime_type: 'image/jpeg',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('valid');
      expect(res.body.valid).toBe(true);
      // The whole point: this flag comes from the library, not from a DB row.
      expect(res.body.cryptographically_verified).toBe(true);
      expect(res.body.record_found).toBe(true);
      expect(res.body.signature.algorithm).toBe('Es256');
    }, 120_000);

    it('reports a tampered asset as invalid, not valid', async () => {
      const signRes = await request(app)
        .post('/governance/c2pa/sign')
        .send(
          signBody({
            asset_base64: jpeg.toString('base64'),
            mime_type: 'image/jpeg',
          }),
        );

      const signed = Buffer.from(signRes.body.asset_base64, 'base64');
      // Flip a bit deep in the image data, well past the manifest box.
      const tampered = Buffer.from(signed);
      tampered[Math.floor(tampered.length * 0.9)] ^= 0xff;

      const res = await request(app)
        .post('/governance/c2pa/verify')
        .send({
          asset_base64: tampered.toString('base64'),
          mime_type: 'image/jpeg',
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.cryptographically_verified).toBe(false);
      expect(['invalid', 'absent']).toContain(res.body.status);
    }, 120_000);

    it('reports an unsigned asset as absent rather than invalid', async () => {
      const res = await request(app)
        .post('/governance/c2pa/verify')
        .send({
          asset_base64: jpeg.toString('base64'),
          mime_type: 'image/jpeg',
        });

      expect(res.body.status).toBe('absent');
      expect(res.body.valid).toBe(false);
      expect(res.body.cryptographically_verified).toBe(false);
      expect(res.body.reason).toMatch(/no C2PA manifest/i);
    }, 120_000);

    it('refuses to claim a signature when a signer exists but no asset was sent', async () => {
      const res = await request(app).post('/governance/c2pa/sign').send(signBody());

      expect(res.status).toBe(201);
      expect(res.body.mode).toBe('unsigned-record');
      expect(res.body.signed).toBe(false);
      expect(res.body.embedded).toBe(false);
      expect(res.body.degraded).toBe(true);
    });
  });
}
