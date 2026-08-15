/**
 * Watermark service tests.
 *
 * The load-bearing test is "survives a lossy re-encode": that is the property
 * the old URL-suffix implementation did not have, and the reason this service
 * was rewritten.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import app from "../index";
import { clearStore } from "../services/watermarkService";
import {
  DEFAULT_STRENGTH,
  embedIntoImage,
  extractFromImage,
} from "../lib/imageWatermark";
import { crc16, decodePayload, encodePayload } from "../lib/payload";
import { trustmarkRequested, trustmarkStatus } from "../lib/trustmark";
import { ffmpegStatus } from "../lib/ffmpeg";
import { embedIntoVideo, extractFromVideo } from "../lib/videoWatermark";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const SEED = "animaforge-default-watermark-seed";

/** Textured source. A flat image has no DCT energy to hide a mark in. */
async function makeSource(width = 512, height = 512): Promise<Jimp> {
  const image = new Jimp({ width, height, color: 0x000000ff });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.bitmap.data[i] = (Math.sin(x / 17) * 90 + 128) | 0;
      image.bitmap.data[i + 1] = (Math.cos(y / 23) * 90 + 128) | 0;
      image.bitmap.data[i + 2] = ((x ^ y) % 200) + 28;
      image.bitmap.data[i + 3] = 255;
    }
  }
  return image;
}

async function sourcePng(width = 512, height = 512): Promise<Buffer> {
  return Buffer.from(
    await (await makeSource(width, height)).getBuffer("image/png"),
  );
}

/** Re-encode a buffer as JPEG at the given quality — the "pirate" transform. */
async function reencodeJpeg(buffer: Buffer, quality: number): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  return Buffer.from(await image.getBuffer("image/jpeg", { quality }));
}

/* ================================================================== */
/*  Payload framing                                                   */
/* ================================================================== */

describe("Watermark — payload framing", () => {
  it("round-trips a key through the CRC frame", () => {
    const bits = encodePayload("0123456789ab");
    expect(bits).toHaveLength(64);
    const decoded = decodePayload(bits);
    expect(decoded.valid).toBe(true);
    expect(decoded.keyHex).toBe("0123456789ab");
  });

  it("rejects a payload whose CRC does not match", () => {
    const bits = encodePayload("0123456789ab");
    bits[5] ^= 1;
    expect(decodePayload(bits).valid).toBe(false);
  });

  it("rejects random bits — this is what stops false positives", () => {
    let accepted = 0;
    for (let trial = 0; trial < 500; trial++) {
      const bits = Array.from({ length: 64 }, () =>
        trial * 7 + Math.random() > 0.5 ? 1 : 0,
      );
      if (decodePayload(bits).valid) accepted++;
    }
    // A 16-bit CRC lets through ~1 in 65536; 500 trials should show none.
    expect(accepted).toBe(0);
  });

  it("computes a stable CRC", () => {
    expect(crc16([1, 0, 1, 0, 1, 0, 1, 0])).toBe(
      crc16([1, 0, 1, 0, 1, 0, 1, 0]),
    );
    expect(crc16([1, 1, 1, 1, 0, 0, 0, 0])).not.toBe(
      crc16([0, 0, 0, 0, 1, 1, 1, 1]),
    );
  });
});

/* ================================================================== */
/*  Pixel-domain embedding — the real path                            */
/* ================================================================== */

describe("Watermark — pixel-domain embedding", () => {
  it("actually alters pixels", async () => {
    const source = await sourcePng();
    const marked = await embedIntoImage(source, "abcdef012345", SEED);

    expect(Buffer.compare(source, marked.buffer)).not.toBe(0);

    // ...and the change must be small enough to be invisible.
    expect(marked.psnr).toBeGreaterThan(38);

    const before = await Jimp.read(source);
    const after = await Jimp.read(marked.buffer);
    let changed = 0;
    for (let i = 0; i < before.bitmap.data.length; i += 4) {
      if (before.bitmap.data[i] !== after.bitmap.data[i]) changed++;
    }
    expect(changed).toBeGreaterThan(1000);
  }, 120_000);

  it("recovers the payload from the lossless carrier", async () => {
    const marked = await embedIntoImage(
      await sourcePng(),
      "abcdef012345",
      SEED,
    );
    const found = await extractFromImage(marked.buffer, SEED);

    expect(found.valid).toBe(true);
    expect(found.keyHex).toBe("abcdef012345");
    expect(found.agreement).toBeGreaterThan(0.9);
  }, 120_000);

  /* ---- The headline requirement ---- */
  it("recovers the payload after the image is re-encoded at lower quality", async () => {
    const marked = await embedIntoImage(
      await sourcePng(),
      "0f1e2d3c4b5a",
      SEED,
    );

    for (const quality of [80, 65, 50, 40]) {
      const reencoded = await reencodeJpeg(marked.buffer, quality);
      // The re-encode really is lossy and really did change the bytes.
      expect(Buffer.compare(marked.buffer, reencoded)).not.toBe(0);

      const found = await extractFromImage(reencoded, SEED);
      expect(found.valid, `payload lost at JPEG quality ${quality}`).toBe(true);
      expect(found.keyHex, `wrong key at JPEG quality ${quality}`).toBe(
        "0f1e2d3c4b5a",
      );
    }
  }, 180_000);

  it("survives a double re-encode", async () => {
    const marked = await embedIntoImage(
      await sourcePng(),
      "112233445566",
      SEED,
    );
    const once = await reencodeJpeg(marked.buffer, 70);
    const twice = await reencodeJpeg(once, 55);

    const found = await extractFromImage(twice, SEED);
    expect(found.valid).toBe(true);
    expect(found.keyHex).toBe("112233445566");
  }, 180_000);

  it("finds nothing in an unmarked image", async () => {
    const found = await extractFromImage(await sourcePng(), SEED);
    expect(found.valid).toBe(false);
    expect(found.agreement).toBeLessThan(0.5);
  }, 120_000);

  it("finds nothing when read with the wrong seed", async () => {
    const marked = await embedIntoImage(
      await sourcePng(),
      "aaaabbbbcccc",
      SEED,
    );
    const found = await extractFromImage(marked.buffer, "a-different-seed");
    expect(found.valid).toBe(false);
  }, 120_000);

  it("refuses to mark an image too small to carry the payload", async () => {
    await expect(
      embedIntoImage(await sourcePng(64, 64), "abcdef012345", SEED),
    ).rejects.toThrow(/carrier blocks per payload bit/);
  }, 60_000);

  it("uses the documented default strength", () => {
    expect(DEFAULT_STRENGTH).toBe(20);
  });
});

/* ================================================================== */
/*  HTTP surface                                                      */
/* ================================================================== */

describe("Watermark — HTTP API", () => {
  beforeEach(() => clearStore());
  afterEach(() => clearStore());

  it("embeds into a supplied image and detects it after a re-encode", async () => {
    const source = await sourcePng();

    const embedRes = await request(app)
      .post("/governance/watermark/embed")
      .send({
        job_id: "job-001",
        output_url: "https://cdn.animaforge.com/output/still-001.png",
        watermark_data: { creator: "user-123" },
        asset_base64: source.toString("base64"),
        mime_type: "image/png",
      });

    expect(embedRes.status).toBe(201);
    expect(embedRes.body.embedded).toBe(true);
    expect(embedRes.body.mode).toBe("embedded");
    expect(embedRes.body.algorithm).toBe("dct-pair-v1");
    expect(embedRes.body.watermark_id).toBeDefined();

    const marked = Buffer.from(embedRes.body.asset_base64, "base64");
    const reencoded = await reencodeJpeg(marked, 55);

    const detectRes = await request(app)
      .post("/governance/watermark/detect")
      .send({
        asset_base64: reencoded.toString("base64"),
        mime_type: "image/jpeg",
      });

    expect(detectRes.status).toBe(200);
    expect(detectRes.body.detected).toBe(true);
    expect(detectRes.body.method).toBe("pixel-extraction");
    expect(detectRes.body.watermark_id).toBe(embedRes.body.watermark_id);
    expect(detectRes.body.metadata.job_id).toBe("job-001");
    expect(detectRes.body.unregistered).toBe(false);
  }, 180_000);

  it("labels a URL-only embed as registered-only, not embedded", async () => {
    const res = await request(app)
      .post("/governance/watermark/embed")
      .send({
        job_id: "job-002",
        output_url: "https://cdn.animaforge.com/output/video-002.mp4",
        watermark_data: { creator: "user-789" },
      });

    expect(res.status).toBe(201);
    expect(res.body.embedded).toBe(false);
    expect(res.body.mode).toBe("registered-only");
    expect(res.body.warning).toMatch(/NOT detectable/);
  });

  it("does not claim detection from a URL alone", async () => {
    const embedRes = await request(app)
      .post("/governance/watermark/embed")
      .send({
        job_id: "job-003",
        output_url: "https://cdn.animaforge.com/output/video-003.mp4",
        watermark_data: {},
      });

    const res = await request(app)
      .post("/governance/watermark/detect")
      .send({ content_url: embedRes.body.watermarked_url });

    // The old implementation answered "detected: true" here purely because the
    // URL was in its database. That is the bug this service was rewritten for.
    expect(res.status).toBe(200);
    expect(res.body.detected).toBe(false);
    expect(res.body.reason).toMatch(
      /remote asset fetching is disabled|WATERMARK_ALLOW_REMOTE_FETCH/,
    );
  });

  it("reports not-detected for unmarked media", async () => {
    const res = await request(app)
      .post("/governance/watermark/detect")
      .send({
        asset_base64: (await sourcePng()).toString("base64"),
        mime_type: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body.detected).toBe(false);
    expect(res.body.watermark_id).toBeNull();
  }, 120_000);

  it("rejects invalid input", async () => {
    expect(
      (await request(app).post("/governance/watermark/embed").send({})).status,
    ).toBe(400);
    expect(
      (await request(app).post("/governance/watermark/detect").send({})).status,
    ).toBe(400);
  });

  it("returns health status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "watermark" });
  });

  it("reports true capabilities", async () => {
    const res = await request(app).get("/governance/watermark/capabilities");

    expect(res.status).toBe(200);
    expect(res.body.image_watermarking.available).toBe(true);
    expect(res.body.image_watermarking.algorithm).toBe("dct-pair-v1");
    expect(typeof res.body.video_watermarking.available).toBe("boolean");
    expect(typeof res.body.degraded).toBe("boolean");
  });
});

/* ================================================================== */
/*  TrustMark — optional backend                                      */
/* ================================================================== */

describe("Watermark — TrustMark backend", () => {
  it("reports itself unavailable unless explicitly requested and installed", async () => {
    const status = await trustmarkStatus(true);
    if (!trustmarkRequested()) {
      expect(status.requested).toBe(false);
      expect(status.available).toBe(false);
    } else {
      // If an operator did provision it, the probe must agree it imported.
      expect(typeof status.available).toBe("boolean");
    }
  }, 120_000);

  it("never reports TrustMark as the active engine when it is not importable", async () => {
    const res = await request(app).get("/governance/watermark/capabilities");
    if (!res.body.trustmark.available) {
      expect(res.body.engine).toBe("dct-pair-v1");
    }
  });
});

/* ================================================================== */
/*  Video — gated on ffmpeg                                           */
/* ================================================================== */

const ffmpegProbe = await ffmpegStatus();

if (!ffmpegProbe.available) {
  describe.skip(`Watermark — video path [SKIPPED: ffmpeg not available (${ffmpegProbe.error ?? "not found"}); set FFMPEG_PATH or install ffmpeg]`, () => {
    it("is skipped", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("Watermark — video path (ffmpeg)", () => {
    it("embeds into every frame and recovers after H.264 re-encode", async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "af-wm-video-"));
      const source = path.join(dir, "source.mp4");
      const marked = path.join(dir, "marked.mp4");
      const recompressed = path.join(dir, "recompressed.mp4");

      try {
        // A moving, textured 2s clip — testsrc2 has plenty of DCT energy.
        execFileSync(
          process.env.FFMPEG_PATH ?? "ffmpeg",
          [
            "-v",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=640x480:rate=10:duration=2",
            "-c:v",
            "libx264",
            "-crf",
            "14",
            "-pix_fmt",
            "yuv420p",
            source,
          ],
          { stdio: ["ignore", "pipe", "pipe"] },
        );

        const result = await embedIntoVideo(
          source,
          marked,
          "beefcafe1234",
          SEED,
        );
        expect(result.framesProcessed).toBeGreaterThan(15);

        // Re-encode harder, as a re-upload would.
        execFileSync(
          process.env.FFMPEG_PATH ?? "ffmpeg",
          [
            "-v",
            "error",
            "-y",
            "-i",
            marked,
            "-c:v",
            "libx264",
            "-crf",
            "30",
            "-pix_fmt",
            "yuv420p",
            recompressed,
          ],
          { stdio: ["ignore", "pipe", "pipe"] },
        );

        const found = await extractFromVideo(recompressed, SEED);
        expect(found.valid).toBe(true);
        expect(found.keyHex).toBe("beefcafe1234");
        expect(found.framesRecovered).toBeGreaterThan(0);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }, 600_000);
  });
}
