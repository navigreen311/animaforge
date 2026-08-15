/**
 * X4 perceptual fingerprinting tests.
 *
 * These assert the property that distinguishes perceptual hashing from the
 * exact-hash lookup it replaces: a re-encoded or rescaled copy still matches,
 * while unrelated content does not.
 */

import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Jimp } from 'jimp';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from '../index';
import { clearStore } from '../services/piracyService';
import {
  MATCH_THRESHOLD,
  computeFingerprint,
  findMatches,
  matchAsset,
  registerFingerprint,
} from '../services/fingerprintService';
import { hammingDistance, hashImageBuffer } from '../lib/perceptualHash';
import { ffmpegStatus } from '../lib/ffmpeg';

const W = 640;
const H = 480;

async function makeImage(variant = 0): Promise<Jimp> {
  const image = new Jimp({ width: W, height: H, color: 0x000000ff });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      image.bitmap.data[i] = (Math.sin((x + variant * 91) / 31) * 100 + 120) | 0;
      image.bitmap.data[i + 1] = (Math.cos((y + variant * 57) / 19) * 80 + 130) | 0;
      image.bitmap.data[i + 2] = ((((x * 3) ^ (y * 5)) + variant * 40) % 220) + 20;
      image.bitmap.data[i + 3] = 255;
    }
  }
  return image;
}

async function png(variant = 0): Promise<Buffer> {
  return Buffer.from(await (await makeImage(variant)).getBuffer('image/png'));
}

afterEach(() => clearStore());

/* ================================================================== */
/*  Hash behaviour                                                    */
/* ================================================================== */

describe('Perceptual hashing', () => {
  it('is stable across a lossy re-encode', async () => {
    const source = await png();
    const base = await hashImageBuffer(source);

    for (const quality of [80, 40, 15]) {
      const reencoded = Buffer.from(
        await (await Jimp.read(source)).getBuffer('image/jpeg', { quality }),
      );
      const distance = hammingDistance(base.phash, (await hashImageBuffer(reencoded)).phash);
      expect(distance, `pHash drifted too far at quality ${quality}`).toBeLessThanOrEqual(
        MATCH_THRESHOLD,
      );
    }
  }, 120_000);

  it('is stable across a rescale', async () => {
    const source = await png();
    const base = await hashImageBuffer(source);

    const halved = Buffer.from(
      await (await Jimp.read(source))
        .resize({ w: W / 2, h: H / 2 })
        .getBuffer('image/jpeg', { quality: 70 }),
    );
    const distance = hammingDistance(base.phash, (await hashImageBuffer(halved)).phash);
    expect(distance).toBeLessThanOrEqual(MATCH_THRESHOLD);
  }, 120_000);

  it('separates unrelated content', async () => {
    const a = await hashImageBuffer(await png(0));
    const b = await hashImageBuffer(await png(3));
    expect(hammingDistance(a.phash, b.phash)).toBeGreaterThan(MATCH_THRESHOLD);
  }, 120_000);

  it('is not an exact-hash lookup — identical content, different bytes', async () => {
    const source = await png();
    const jpeg = Buffer.from(
      await (await Jimp.read(source)).getBuffer('image/jpeg', { quality: 60 }),
    );
    // Byte-identical? Definitely not. Perceptually identical? Yes.
    expect(Buffer.compare(source, jpeg)).not.toBe(0);
    const a = await hashImageBuffer(source);
    const b = await hashImageBuffer(jpeg);
    expect(a.phash).not.toBe('');
    expect(hammingDistance(a.phash, b.phash)).toBeLessThanOrEqual(MATCH_THRESHOLD);
  }, 120_000);

  it('scores maximum distance for malformed hashes rather than pretending to match', () => {
    expect(hammingDistance('', 'abcd')).toBe(64);
    expect(hammingDistance('zzzz', 'abcd')).toBe(64);
  });
});

/* ================================================================== */
/*  Registration + matching                                           */
/* ================================================================== */

describe('Fingerprint registration and matching', () => {
  it('matches a re-encoded copy of registered content', async () => {
    const source = await png();
    const registered = await registerFingerprint('output-1', {
      asset_base64: source.toString('base64'),
      mime_type: 'image/png',
    });
    expect(registered.phash).toHaveLength(16);

    const pirated = Buffer.from(
      await (await Jimp.read(source)).getBuffer('image/jpeg', { quality: 45 }),
    );
    const { matches } = await matchAsset({
      asset_base64: pirated.toString('base64'),
      mime_type: 'image/jpeg',
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].fingerprint.outputId).toBe('output-1');
    expect(matches[0].distance).toBeLessThanOrEqual(MATCH_THRESHOLD);
    expect(matches[0].similarity).toBeGreaterThan(0.8);
    expect(['high', 'medium', 'low']).toContain(matches[0].confidence);
  }, 180_000);

  it('does not match unrelated content', async () => {
    await registerFingerprint('output-1', {
      asset_base64: (await png(0)).toString('base64'),
      mime_type: 'image/png',
    });

    const { matches } = await matchAsset({
      asset_base64: (await png(4)).toString('base64'),
      mime_type: 'image/png',
    });
    expect(matches).toHaveLength(0);
  }, 180_000);

  it('ranks the closest registered fingerprint first', async () => {
    const source = await png(0);
    await registerFingerprint('exact', {
      asset_base64: source.toString('base64'),
      mime_type: 'image/png',
    });
    await registerFingerprint('other', {
      asset_base64: (await png(5)).toString('base64'),
      mime_type: 'image/png',
    });

    const probe = await computeFingerprint({
      asset_base64: (
        await (await Jimp.read(source)).getBuffer('image/jpeg', { quality: 70 })
      ).toString('base64') as string,
      mime_type: 'image/jpeg',
    });
    const matches = await findMatches(probe);
    expect(matches[0].fingerprint.outputId).toBe('exact');
  }, 180_000);

  it('refuses to fingerprint when no media is supplied', async () => {
    await expect(computeFingerprint({})).rejects.toThrow(/asset_base64 or asset_path/);
  });
});

/* ================================================================== */
/*  HTTP surface                                                      */
/* ================================================================== */

describe('Piracy — fingerprint HTTP API', () => {
  it('registers with a fingerprint and matches a re-encoded copy', async () => {
    const source = await png();

    const registerRes = await request(app)
      .post('/piracy/register')
      .send({
        outputId: 'out-http-1',
        watermarkId: 'wm-http-1',
        asset_base64: source.toString('base64'),
        mime_type: 'image/png',
        userId: 'user-1',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.fingerprinted).toBe(true);
    expect(registerRes.body.phash).toHaveLength(16);

    const pirated = Buffer.from(
      await (await Jimp.read(source)).getBuffer('image/jpeg', { quality: 50 }),
    );

    const matchRes = await request(app)
      .post('/piracy/match')
      .send({
        asset_base64: pirated.toString('base64'),
        mime_type: 'image/jpeg',
      });

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.algorithm).toBe('phash-dct64');
    expect(matchRes.body.threshold).toBe(MATCH_THRESHOLD);
    expect(matchRes.body.matches).toHaveLength(1);
    expect(matchRes.body.matches[0].fingerprint.outputId).toBe('out-http-1');
    expect(
      matchRes.body.matches[0].hamming_distance ?? matchRes.body.matches[0].distance,
    ).toBeLessThanOrEqual(MATCH_THRESHOLD);
  }, 180_000);

  it('returns no matches for unrelated media', async () => {
    await request(app)
      .post('/piracy/register')
      .send({
        outputId: 'out-http-2',
        watermarkId: 'wm-http-2',
        asset_base64: (await png(0)).toString('base64'),
        mime_type: 'image/png',
      });

    const res = await request(app)
      .post('/piracy/match')
      .send({
        asset_base64: (await png(6)).toString('base64'),
        mime_type: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(0);
  }, 180_000);
});

/* ================================================================== */
/*  Video fingerprinting — gated on ffmpeg                            */
/* ================================================================== */

const ffmpegProbe = await ffmpegStatus();

if (!ffmpegProbe.available) {
  describe.skip(`Video fingerprinting [SKIPPED: ffmpeg not available (${ffmpegProbe.error ?? 'not found'}); set FFMPEG_PATH or install ffmpeg]`, () => {
    it('is skipped', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('Video fingerprinting (ffmpeg)', () => {
    it('matches a re-encoded video and rejects a different one', async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'af-fp-video-'));
      const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
      const original = path.join(dir, 'original.mp4');
      const pirated = path.join(dir, 'pirated.mp4');
      const different = path.join(dir, 'different.mp4');

      try {
        execFileSync(
          ffmpeg,
          [
            '-v',
            'error',
            '-y',
            '-f',
            'lavfi',
            '-i',
            'testsrc2=size=640x480:rate=10:duration=3',
            '-c:v',
            'libx264',
            '-crf',
            '16',
            '-pix_fmt',
            'yuv420p',
            original,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        // Re-encoded and rescaled, as a re-upload would be.
        execFileSync(
          ffmpeg,
          [
            '-v',
            'error',
            '-y',
            '-i',
            original,
            '-vf',
            'scale=320:240',
            '-c:v',
            'libx264',
            '-crf',
            '32',
            '-pix_fmt',
            'yuv420p',
            pirated,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        execFileSync(
          ffmpeg,
          [
            '-v',
            'error',
            '-y',
            '-f',
            'lavfi',
            '-i',
            'smptebars=size=640x480:rate=10:duration=3',
            '-c:v',
            'libx264',
            '-crf',
            '16',
            '-pix_fmt',
            'yuv420p',
            different,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        );

        const registered = await registerFingerprint('video-out-1', {
          asset_path: original,
          mime_type: 'video/mp4',
        });
        expect(registered.mediaType).toBe('video');
        expect(registered.frameHashes.length).toBeGreaterThan(1);

        const hit = await matchAsset({
          asset_path: pirated,
          mime_type: 'video/mp4',
        });
        expect(hit.matches.length).toBeGreaterThan(0);
        expect(hit.matches[0].fingerprint.outputId).toBe('video-out-1');

        const miss = await matchAsset({
          asset_path: different,
          mime_type: 'video/mp4',
        });
        expect(miss.matches).toHaveLength(0);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }, 600_000);
  });
}
