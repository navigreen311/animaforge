/**
 * ffmpeg / ffprobe discovery and raw-frame plumbing.
 *
 * ffmpeg is NOT vendored by this repo. Every video capability is gated on the
 * binary actually being present and is reported truthfully by the capability
 * endpoint rather than assumed.
 */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const FFMPEG_BIN = process.env.FFMPEG_PATH ?? 'ffmpeg';
export const FFPROBE_BIN = process.env.FFPROBE_PATH ?? 'ffprobe';

export interface FfmpegStatus {
  available: boolean;
  ffmpegPath: string;
  ffprobePath: string;
  version: string | null;
  error: string | null;
}

let cached: FfmpegStatus | null = null;

/** Probe for ffmpeg once per process. */
export async function ffmpegStatus(force = false): Promise<FfmpegStatus> {
  if (cached && !force) return cached;
  try {
    const { stdout } = await execFileAsync(FFMPEG_BIN, ['-version'], {
      timeout: 10_000,
    });
    const version = stdout.split('\n')[0]?.trim() ?? null;
    await execFileAsync(FFPROBE_BIN, ['-version'], { timeout: 10_000 });
    cached = {
      available: true,
      ffmpegPath: FFMPEG_BIN,
      ffprobePath: FFPROBE_BIN,
      version,
      error: null,
    };
  } catch (err) {
    cached = {
      available: false,
      ffmpegPath: FFMPEG_BIN,
      ffprobePath: FFPROBE_BIN,
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
  frameRate: number;
  codec: string;
  pixelFormat: string;
}

export async function probeVideo(path: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(
    FFPROBE_BIN,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,avg_frame_rate,codec_name,pix_fmt:format=duration',
      '-of',
      'json',
      path,
    ],
    { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      codec_name?: string;
      pix_fmt?: string;
    }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`ffprobe found no video stream in ${path}`);
  }
  const [num, den] = (stream.avg_frame_rate ?? '0/1').split('/').map(Number);
  return {
    width: stream.width,
    height: stream.height,
    durationSeconds: Number(parsed.format?.duration ?? 0),
    frameRate: den ? num / den : 0,
    codec: stream.codec_name ?? 'unknown',
    pixelFormat: stream.pix_fmt ?? 'unknown',
  };
}

/**
 * Decode `count` frames spread evenly across the video as raw RGBA.
 *
 * Sampling rather than decoding everything keeps fingerprinting cheap on long
 * assets while still covering the whole timeline.
 */
export async function sampleFramesRgba(
  path: string,
  info: VideoInfo,
  count: number,
): Promise<Array<{ width: number; height: number; data: Buffer }>> {
  const frames: Array<{ width: number; height: number; data: Buffer }> = [];
  const duration = info.durationSeconds > 0 ? info.durationSeconds : 0;

  for (let i = 0; i < count; i++) {
    // Sample at the midpoint of each of `count` equal slices, so we never land
    // on the very first or very last frame (often black or a fade).
    const at = duration > 0 ? (duration * (i + 0.5)) / count : 0;
    const data = await decodeSingleFrame(path, at, info);
    if (data) frames.push({ width: info.width, height: info.height, data });
  }
  return frames;
}

function decodeSingleFrame(
  path: string,
  atSeconds: number,
  info: VideoInfo,
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      FFMPEG_BIN,
      [
        '-v',
        'error',
        '-ss',
        atSeconds.toFixed(3),
        '-i',
        path,
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        '-',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => errChunks.push(c));
    child.on('error', reject);
    child.on('close', (code) => {
      const expected = info.width * info.height * 4;
      const buf = Buffer.concat(chunks);
      if (code !== 0 && buf.length < expected) {
        reject(
          new Error(
            `ffmpeg exited ${code} decoding frame at ${atSeconds}s: ` +
              Buffer.concat(errChunks).toString().slice(0, 400),
          ),
        );
        return;
      }
      resolve(buf.length >= expected ? buf.subarray(0, expected) : null);
    });
  });
}

/**
 * Stream every frame of a video through `transform` and re-encode.
 *
 * Re-encoding is unavoidable: altering pixels means the compressed bitstream
 * has to be rebuilt. `crf` therefore directly bounds how much of the watermark
 * survives the write, which is why it defaults low (high quality).
 */
export async function transformVideoFrames(
  inputPath: string,
  outputPath: string,
  info: VideoInfo,
  transform: (frame: Buffer, index: number) => void,
  options: { crf?: number; preset?: string } = {},
): Promise<number> {
  const frameBytes = info.width * info.height * 4;

  const decoder = spawn(
    FFMPEG_BIN,
    ['-v', 'error', '-i', inputPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const encoder = spawn(
    FFMPEG_BIN,
    [
      '-v',
      'error',
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${info.width}x${info.height}`,
      '-r',
      String(info.frameRate > 0 ? info.frameRate : 25),
      '-i',
      '-',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      options.preset ?? 'medium',
      '-crf',
      String(options.crf ?? 16),
      '-pix_fmt',
      'yuv420p',
      outputPath,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );

  const encoderErr: Buffer[] = [];
  encoder.stderr.on('data', (c: Buffer) => encoderErr.push(c));
  const decoderErr: Buffer[] = [];
  decoder.stderr.on('data', (c: Buffer) => decoderErr.push(c));

  let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let frameIndex = 0;

  const done = new Promise<number>((resolve, reject) => {
    let encoderClosed = false;
    let decoderClosed = false;
    let failed = false;

    const fail = (e: Error): void => {
      if (!failed) {
        failed = true;
        reject(e);
      }
    };

    decoder.stdout.on('data', (chunk: Buffer) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      while (pending.length >= frameBytes) {
        const frame = Buffer.from(pending.subarray(0, frameBytes));
        pending = pending.subarray(frameBytes);
        try {
          transform(frame, frameIndex++);
        } catch (e) {
          fail(e instanceof Error ? e : new Error(String(e)));
          decoder.kill();
          encoder.stdin.end();
          return;
        }
        if (!encoder.stdin.write(frame)) {
          decoder.stdout.pause();
          encoder.stdin.once('drain', () => decoder.stdout.resume());
        }
      }
    });

    decoder.on('error', fail);
    encoder.on('error', fail);
    encoder.stdin.on('error', fail);

    decoder.on('close', (code) => {
      decoderClosed = true;
      if (code !== 0 && !failed) {
        fail(
          new Error(
            `ffmpeg decode failed (${code}): ` + Buffer.concat(decoderErr).toString().slice(0, 400),
          ),
        );
      }
      encoder.stdin.end();
    });

    encoder.on('close', (code) => {
      encoderClosed = true;
      if (code !== 0 && !failed) {
        fail(
          new Error(
            `ffmpeg encode failed (${code}): ` + Buffer.concat(encoderErr).toString().slice(0, 400),
          ),
        );
        return;
      }
      if (decoderClosed && encoderClosed && !failed) resolve(frameIndex);
    });
  });

  return done;
}
