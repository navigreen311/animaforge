import { v4 as uuidv4 } from "uuid";
import { ExportJob, VideoExportInput, AudioExportInput, ProjectExportInput, AvatarExportInput } from "../models/exportSchemas";
import { getBitrate, getEncodingPreset, getSupportedFormats } from "./formatSpecs";

const jobs = new Map<string, ExportJob>();

export function createExportJob(type: ExportJob["type"], params: ExportJob["params"]): ExportJob {
  const job: ExportJob = {
    id: uuidv4(), type, status: "queued", progress: 0, params,
    outputUrl: null, fileSize: null, createdAt: new Date().toISOString(), completedAt: null, error: null,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): ExportJob | undefined {
  return jobs.get(id);
}

export function processVideoExport(job: ExportJob): ExportJob {
  const params = job.params as VideoExportInput;
  const formatCodecMap: Record<string, string[]> = { mp4: ["h264", "h265", "av1"], webm: ["vp9"], mov: ["h264", "h265"] };
  const allowedCodecs = formatCodecMap[params.format];
  if (!allowedCodecs || !allowedCodecs.includes(params.codec)) {
    job.status = "failed";
    job.error = `Codec '${params.codec}' is not compatible with format '${params.format}'`;
    return job;
  }
  job.status = "processing"; job.progress = 25;
  const preset = getEncodingPreset(params.codec, params.resolution);
  const bitrate = getBitrate(params.codec, params.resolution);
  const estimatedDuration = params.shotIds.length * 5;
  const estimatedSize = Math.round((bitrate * estimatedDuration) / 8);
  job.status = "encoding"; job.progress = 60;
  job.status = "packaging"; job.progress = 90;
  job.status = "completed"; job.progress = 100;
  job.fileSize = estimatedSize;
  job.outputUrl = `https://cdn.animaforge.io/exports/${job.id}/output.${params.format}`;
  job.completedAt = new Date().toISOString();
  return job;
}

export function processAudioExport(job: ExportJob): ExportJob {
  const params = job.params as AudioExportInput;
  job.status = "processing"; job.progress = 30;
  const bitrateMap: Record<string, number> = { wav: 1411, mp3: 320, aac: 256, opus: 128 };
  const estimatedDuration = params.shotIds.length * 5;
  const bitrate = bitrateMap[params.format] ?? 256;
  const estimatedSize = Math.round((bitrate * estimatedDuration) / 8);
  job.status = "encoding"; job.progress = 70;
  job.status = "completed"; job.progress = 100;
  job.fileSize = estimatedSize;
  job.outputUrl = `https://cdn.animaforge.io/exports/${job.id}/audio.${params.format}`;
  job.completedAt = new Date().toISOString();
  return job;
}

export function processProjectExport(job: ExportJob): ExportJob {
  const params = job.params as ProjectExportInput;
  job.status = "processing"; job.progress = 20;
  job.status = "packaging"; job.progress = 50;
  const baseSize = 50_000;
  const assetSize = params.includeAssets ? 200_000 : 0;
  job.status = "completed"; job.progress = 100;
  job.fileSize = baseSize + assetSize;
  job.outputUrl = `https://cdn.animaforge.io/exports/${job.id}/project.zip`;
  job.completedAt = new Date().toISOString();
  return job;
}

export function processAvatarExport(job: ExportJob): ExportJob {
  const params = job.params as AvatarExportInput;
  job.status = "processing"; job.progress = 30;
  const sizeMap: Record<string, number> = { gltf: 15_000, usd: 20_000, fbx: 25_000, bvh: 500, arkit: 8_000 };
  job.status = "encoding"; job.progress = 70;
  job.status = "completed"; job.progress = 100;
  job.fileSize = sizeMap[params.format] ?? 10_000;
  job.outputUrl = `https://cdn.animaforge.io/exports/${job.id}/avatar.${params.format}`;
  job.completedAt = new Date().toISOString();
  return job;
}

export function getExportFormats() {
  return getSupportedFormats();
}
