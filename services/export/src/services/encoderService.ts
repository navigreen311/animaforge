/**
 * AnimaForge — FFmpeg encoder service
 *
 * Wraps common FFmpeg operations with graceful fallback when the binary
 * is not available on the host.
 */

import { spawn, execFile } from 'child_process';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncodeVideoOptions {
  inputPath: string;
  outputPath: string;
  codec?: keyof typeof CODEC_MAP;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: string;
  audioBitrate?: string;
  preset?: string;
  crf?: number;
}

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  size: number;
}

// ---------------------------------------------------------------------------
// Codec map
// ---------------------------------------------------------------------------

const CODEC_MAP = {
  h264: 'libx264',
  h265: 'libx265',
  vp9: 'libvpx-vp9',
  av1: 'libaom-av1',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

function runFFprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', args, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout || stderr);
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when ffmpeg is reachable on the system PATH.
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
      proc.on('error', reject);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Encode (transcode) a video file.
 *
 * Falls back to a file-copy when ffmpeg is not installed so that the
 * rest of the pipeline can still be exercised in development.
 */
export async function encodeVideo(options: EncodeVideoOptions): Promise<string> {
  const {
    inputPath,
    outputPath,
    codec = 'h264',
    width,
    height,
    fps,
    bitrate,
    audioBitrate,
    preset = 'medium',
    crf,
  } = options;

  if (!(await isFFmpegAvailable())) {
    // Fallback: copy input → output so downstream steps still have a file
    const fs = await import('fs/promises');
    await fs.copyFile(inputPath, outputPath);
    return outputPath;
  }

  const args: string[] = ['-y', '-i', inputPath];

  // Video codec
  const lib = CODEC_MAP[codec] ?? CODEC_MAP.h264;
  args.push('-c:v', lib);

  if (preset) args.push('-preset', preset);
  if (crf !== undefined) args.push('-crf', String(crf));
  if (bitrate) args.push('-b:v', bitrate);

  // Resolution
  if (width && height) {
    args.push('-vf', `scale=${width}:${height}`);
  }

  if (fps) args.push('-r', String(fps));

  // Audio
  args.push('-c:a', 'aac');
  if (audioBitrate) args.push('-b:a', audioBitrate);

  args.push(outputPath);

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Extract the audio stream from a video file.
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format = 'mp3',
): Promise<string> {
  if (!(await isFFmpegAvailable())) {
    throw new Error('ffmpeg is not available — cannot extract audio');
  }

  const args = ['-y', '-i', inputPath, '-vn', '-acodec'];

  switch (format) {
    case 'wav':
      args.push('pcm_s16le');
      break;
    case 'aac':
      args.push('aac');
      break;
    case 'flac':
      args.push('flac');
      break;
    default:
      args.push('libmp3lame', '-q:a', '2');
  }

  args.push(outputPath);
  await runFFmpeg(args);
  return outputPath;
}

/**
 * Generate a thumbnail image from a video at the specified timestamp.
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestampSec = 0,
  size = '640x360',
): Promise<string> {
  if (!(await isFFmpegAvailable())) {
    throw new Error('ffmpeg is not available — cannot generate thumbnail');
  }

  const args = [
    '-y',
    '-i',
    inputPath,
    '-ss',
    String(timestampSec),
    '-vframes',
    '1',
    '-s',
    size,
    outputPath,
  ];

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Retrieve media metadata via ffprobe.
 */
export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  const raw = await runFFprobe([
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const data = JSON.parse(raw);
  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video') ?? {};
  const format = data.format ?? {};

  return {
    duration: parseFloat(format.duration ?? '0'),
    width: parseInt(videoStream.width ?? '0', 10),
    height: parseInt(videoStream.height ?? '0', 10),
    codec: videoStream.codec_name ?? 'unknown',
    fps: parseFps(videoStream.r_frame_rate),
    bitrate: parseInt(format.bit_rate ?? '0', 10),
    size: parseInt(format.size ?? '0', 10),
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseFps(rateString?: string): number {
  if (!rateString) return 0;
  const [num, den] = rateString.split('/').map(Number);
  return den ? num / den : num || 0;
}
