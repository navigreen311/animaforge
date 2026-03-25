import { v4 as uuidv4 } from "uuid";

export interface PlatformSpec {
  aspectRatio: string;
  resolution: string;
  maxDuration?: number;
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  youtube: { aspectRatio: "16:9", resolution: "1920x1080" },
  tiktok: { aspectRatio: "9:16", resolution: "1080x1920", maxDuration: 180 },
  instagram: { aspectRatio: "1:1", resolution: "1080x1080" },
  instagram_reels: { aspectRatio: "4:5", resolution: "1080x1350" },
  twitter: { aspectRatio: "16:9", resolution: "1280x720" },
};

export interface RepurposeResult {
  outputUrl: string;
  aspectRatio: string;
  resolution: string;
  duration: number;
  platform: string;
}

export interface ThumbnailResult {
  thumbnails: Array<{ url: string; timestamp_ms: number }>;
}

export interface SubtitleResult {
  srt: string;
  vtt: string;
  burned_url: string;
}

export interface TrailerResult {
  trailer_url: string;
  shots_used: string[];
}

export function repurposeForPlatform(
  videoUrl: string,
  targetPlatform: string,
): RepurposeResult {
  const spec = PLATFORM_SPECS[targetPlatform];
  if (!spec) {
    const err = new Error(`Unsupported target platform: ${targetPlatform}`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_PLATFORM";
    throw err;
  }

  const id = uuidv4().slice(0, 8);
  return {
    outputUrl: `https://cdn.animaforge.io/repurposed/${targetPlatform}/${id}.mp4`,
    aspectRatio: spec.aspectRatio,
    resolution: spec.resolution,
    duration: spec.maxDuration ?? 120,
    platform: targetPlatform,
  };
}

export function generateThumbnails(
  videoUrl: string,
  count: number = 3,
): ThumbnailResult {
  const thumbnails = Array.from({ length: count }, (_, i) => ({
    url: `https://cdn.animaforge.io/thumbnails/${uuidv4().slice(0, 8)}.jpg`,
    timestamp_ms: Math.round(((i + 1) / (count + 1)) * 60000),
  }));

  return { thumbnails };
}

export function generateSubtitles(
  videoUrl: string,
  language: string = "en",
): SubtitleResult {
  const id = uuidv4().slice(0, 8);
  return {
    srt: `1\n00:00:01,000 --> 00:00:04,000\n[Simulated ${language} subtitle line 1]\n\n2\n00:00:04,500 --> 00:00:08,000\n[Simulated ${language} subtitle line 2]\n`,
    vtt: `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n[Simulated ${language} subtitle line 1]\n\n00:00:04.500 --> 00:00:08.000\n[Simulated ${language} subtitle line 2]\n`,
    burned_url: `https://cdn.animaforge.io/subtitled/${id}_${language}.mp4`,
  };
}

export function generateTrailer(
  projectId: string,
  duration: number = 30,
): TrailerResult {
  const shotCount = Math.max(3, Math.floor(duration / 5));
  const shots_used = Array.from({ length: shotCount }, (_, i) => `shot_${i + 1}`);

  return {
    trailer_url: `https://cdn.animaforge.io/trailers/${projectId}/${uuidv4().slice(0, 8)}.mp4`,
    shots_used,
  };
}

export function batchRepurpose(
  videoUrl: string,
  platforms: string[],
): RepurposeResult[] {
  return platforms.map((platform) => repurposeForPlatform(videoUrl, platform));
}
