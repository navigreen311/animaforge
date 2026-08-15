/**
 * Minimal ffmpeg access for video fingerprinting.
 *
 * ffmpeg is not vendored. Video fingerprinting is gated on the binary being
 * present and its absence is reported through /piracy/capabilities rather than
 * being papered over.
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const FFMPEG_BIN = process.env.FFMPEG_PATH ?? "ffmpeg";
export const FFPROBE_BIN = process.env.FFPROBE_PATH ?? "ffprobe";

export interface FfmpegStatus {
  available: boolean;
  version: string | null;
  error: string | null;
}

let cached: FfmpegStatus | null = null;

export async function ffmpegStatus(force = false): Promise<FfmpegStatus> {
  if (cached && !force) return cached;
  try {
    const { stdout } = await execFileAsync(FFMPEG_BIN, ["-version"], {
      timeout: 10_000,
    });
    await execFileAsync(FFPROBE_BIN, ["-version"], { timeout: 10_000 });
    cached = {
      available: true,
      version: stdout.split("\n")[0]?.trim() ?? null,
      error: null,
    };
  } catch (err) {
    cached = {
      available: false,
      version: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return cached;
}

export interface VideoInfo {
  width: number;
  height: number;
  durationSeconds: number;
}

export async function probeVideo(path: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(
    FFPROBE_BIN,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      path,
    ],
    { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`ffprobe found no video stream in ${path}`);
  }
  return {
    width: stream.width,
    height: stream.height,
    durationSeconds: Number(parsed.format?.duration ?? 0),
  };
}

function decodeFrame(
  path: string,
  atSeconds: number,
  info: VideoInfo,
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      FFMPEG_BIN,
      [
        "-v",
        "error",
        "-ss",
        atSeconds.toFixed(3),
        "-i",
        path,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.stderr.on("data", (c: Buffer) => errs.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      const expected = info.width * info.height * 4;
      const buf = Buffer.concat(chunks);
      if (code !== 0 && buf.length < expected) {
        reject(
          new Error(
            `ffmpeg exited ${code}: ${Buffer.concat(errs).toString().slice(0, 300)}`,
          ),
        );
        return;
      }
      resolve(buf.length >= expected ? buf.subarray(0, expected) : null);
    });
  });
}

/**
 * Sample frames evenly across the timeline.
 *
 * Even spacing (rather than "first N frames") is what makes two fingerprints
 * of the same video comparable position-by-position even when one copy has a
 * different frame rate.
 */
export async function sampleFrames(
  path: string,
  count: number,
): Promise<{
  info: VideoInfo;
  frames: Array<{ width: number; height: number; data: Buffer }>;
}> {
  const info = await probeVideo(path);
  const frames: Array<{ width: number; height: number; data: Buffer }> = [];
  const duration = info.durationSeconds > 0 ? info.durationSeconds : 0;
  for (let i = 0; i < count; i++) {
    const at = duration > 0 ? (duration * (i + 0.5)) / count : 0;
    const data = await decodeFrame(path, at, info);
    if (data) frames.push({ width: info.width, height: info.height, data });
  }
  return { info, frames };
}
