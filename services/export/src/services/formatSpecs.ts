export interface EncodingPreset {
  codec: string;
  container: string;
  bitrate: string;
  maxDuration: number;
  description: string;
}

export interface FormatSpec {
  format: string;
  category: "video" | "audio" | "3d";
  codecs?: string[];
  description: string;
  details: Record<string, string>;
}

const VIDEO_BITRATES: Record<string, Record<string, number>> = {
  h264: { "720p": 5_000, "1080p": 10_000, "4k": 35_000 },
  h265: { "720p": 3_000, "1080p": 6_000, "4k": 18_000 },
  av1: { "720p": 2_500, "1080p": 5_000, "4k": 15_000 },
  vp9: { "720p": 3_500, "1080p": 7_000, "4k": 20_000 },
};

const DURATION_LIMITS: Record<string, number> = {
  free: 300,
  pro: 1800,
  enterprise: 7200,
};

export function getBitrate(codec: string, resolution: string): number {
  return VIDEO_BITRATES[codec]?.[resolution] ?? 10_000;
}

export function getDurationLimit(tier: string): number {
  return DURATION_LIMITS[tier] ?? DURATION_LIMITS.free;
}

export function getEncodingPreset(codec: string, resolution: string): EncodingPreset {
  const bitrate = getBitrate(codec, resolution);
  const containerMap: Record<string, string> = { h264: "mp4", h265: "mp4", av1: "mp4", vp9: "webm" };
  const descMap: Record<string, string> = {
    h264: "H.264 - wide compatibility, web-optimized",
    h265: "H.265/HEVC - high quality, smaller files",
    av1: "AV1 - modern, royalty-free, best compression",
    vp9: "VP9 - open-source, web-friendly",
  };
  return {
    codec,
    container: containerMap[codec] ?? "mp4",
    bitrate: `${bitrate} kbps`,
    maxDuration: DURATION_LIMITS.pro,
    description: descMap[codec] ?? codec,
  };
}

export function getSupportedFormats(): FormatSpec[] {
  return [
    { format: "mp4", category: "video", codecs: ["h264", "h265", "av1"], description: "MPEG-4 container - universal playback", details: { h264: "H.264 - web-optimized, widest compatibility", h265: "H.265/HEVC - higher quality at lower bitrates", av1: "AV1 - modern codec, best compression, royalty-free" } },
    { format: "webm", category: "video", codecs: ["vp9"], description: "WebM container - open-source, web-native", details: { vp9: "VP9 - open-source codec, good quality/size ratio" } },
    { format: "mov", category: "video", codecs: ["h264", "h265"], description: "QuickTime container - Apple ecosystem", details: { h264: "H.264 - broad compatibility", h265: "H.265/HEVC - ProRes-grade quality" } },
    { format: "wav", category: "audio", description: "WAV - uncompressed, lossless audio", details: { pcm: "PCM 16/24-bit, 44.1/48 kHz" } },
    { format: "mp3", category: "audio", description: "MP3 - compressed, wide compatibility", details: { mp3: "MPEG Layer 3, 128-320 kbps" } },
    { format: "aac", category: "audio", description: "AAC - compressed, better quality than MP3", details: { aac: "Advanced Audio Coding, 128-256 kbps" } },
    { format: "opus", category: "audio", description: "Opus - low-latency, ideal for streaming", details: { opus: "Opus codec, 64-256 kbps, ultra-low latency" } },
    { format: "gltf", category: "3d", description: "glTF 2.0 - open standard for 3D models", details: { gltf: "GL Transmission Format, PBR materials, skeletal animation" } },
    { format: "usd", category: "3d", description: "USD/USDZ - Pixar Universal Scene Description", details: { usd: "USD for DCC tools, USDZ for AR/mobile" } },
    { format: "fbx", category: "3d", description: "FBX - Autodesk interchange format", details: { fbx: "Binary/ASCII, skeletal animation, blendshapes" } },
    { format: "bvh", category: "3d", description: "BVH - motion capture data format", details: { bvh: "Biovision Hierarchy, skeletal motion data only" } },
    { format: "arkit", category: "3d", description: "ARKit - Apple AR blendshape format", details: { arkit: "52 ARKit blendshapes, facial animation rig" } },
  ];
}
