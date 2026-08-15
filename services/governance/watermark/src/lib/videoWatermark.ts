/**
 * Video watermarking — the same `dct-pair-v1` mark applied per frame.
 *
 * Marking every frame means a clip cut out of the middle still carries the
 * payload, and detection can majority-vote across sampled frames instead of
 * betting on one. Requires ffmpeg; callers must check `ffmpegStatus()` first.
 */

import {
  ffmpegStatus,
  probeVideo,
  sampleFramesRgba,
  transformVideoFrames,
} from "./ffmpeg";
import type { VideoInfo } from "./ffmpeg";
import {
  canCarryPayload,
  embedIntoFrame,
  extractFromFrame,
} from "./imageWatermark";
import { DEFAULT_STRENGTH } from "./imageWatermark";

export class FfmpegUnavailableError extends Error {
  constructor(detail: string) {
    super(`ffmpeg is not available: ${detail}`);
    this.name = "FfmpegUnavailableError";
  }
}

async function requireFfmpeg(): Promise<void> {
  const status = await ffmpegStatus();
  if (!status.available) {
    throw new FfmpegUnavailableError(status.error ?? "binary not found");
  }
}

export interface VideoEmbedResult {
  framesProcessed: number;
  info: VideoInfo;
}

/** Watermark every frame of `inputPath`, writing the result to `outputPath`. */
export async function embedIntoVideo(
  inputPath: string,
  outputPath: string,
  keyHex: string,
  seedHex: string,
  options: { strength?: number; crf?: number } = {},
): Promise<VideoEmbedResult> {
  await requireFfmpeg();
  const info = await probeVideo(inputPath);
  if (!canCarryPayload(info.width, info.height)) {
    throw new Error(
      `video is ${info.width}x${info.height}, too small to carry a watermark payload`,
    );
  }

  const framesProcessed = await transformVideoFrames(
    inputPath,
    outputPath,
    info,
    (frame) => {
      embedIntoFrame(
        { width: info.width, height: info.height, data: frame },
        keyHex,
        seedHex,
        options.strength ?? DEFAULT_STRENGTH,
      );
    },
    { crf: options.crf ?? 16 },
  );

  return { framesProcessed, info };
}

export interface VideoExtraction {
  valid: boolean;
  keyHex: string;
  agreement: number;
  framesSampled: number;
  framesRecovered: number;
}

/**
 * Recover a watermark from a video by sampling frames across the timeline.
 *
 * A frame counts only when its own CRC validates, and the reported key is the
 * one the plurality of validating frames agree on — so a handful of corrupted
 * frames cannot invent a key that was never embedded.
 */
export async function extractFromVideo(
  inputPath: string,
  seedHex: string,
  sampleCount = 9,
): Promise<VideoExtraction> {
  await requireFfmpeg();
  const info = await probeVideo(inputPath);
  const frames = await sampleFramesRgba(inputPath, info, sampleCount);

  const tally = new Map<string, { count: number; agreement: number }>();
  let agreementSum = 0;

  for (const frame of frames) {
    const result = extractFromFrame(
      { width: frame.width, height: frame.height, data: frame.data },
      seedHex,
    );
    agreementSum += result.agreement;
    if (!result.valid) continue;
    const entry = tally.get(result.keyHex) ?? { count: 0, agreement: 0 };
    entry.count += 1;
    entry.agreement += result.agreement;
    tally.set(result.keyHex, entry);
  }

  let bestKey = "";
  let best = { count: 0, agreement: 0 };
  for (const [key, entry] of tally) {
    if (entry.count > best.count) {
      bestKey = key;
      best = entry;
    }
  }

  return {
    valid: best.count > 0,
    keyHex: bestKey,
    agreement: Number(
      (frames.length ? agreementSum / frames.length : 0).toFixed(4),
    ),
    framesSampled: frames.length,
    framesRecovered: best.count,
  };
}
