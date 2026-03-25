import { v4 as uuidv4 } from "uuid";
import { ExportJob, VideoExportInput, AudioExportInput, ProjectExportInput, AvatarExportInput } from "../models/exportSchemas";
import { getBitrate, getEncodingPreset, getSupportedFormats } from "./formatSpecs";
import { prisma } from "../db";

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

let usePrisma = true;
async function withFallback<T>(p: () => Promise<T>, m: () => T): Promise<T> { if (!usePrisma) return m(); try { return await p(); } catch { usePrisma = false; return m(); } }

export interface BatchExportResult { batchId: string; projectId: string; jobs: ExportJob[]; totalShots: number; format: string; createdAt: string; }
export function batchExport(projectId: string, shotIds: string[], format: "mp4"|"webm"|"mov", options: {codec?:string;resolution?:"720p"|"1080p"|"4k";fps?:24|30|60;chunkSize?:number}={}): BatchExportResult {
  const batchId=uuidv4(),cs=options.chunkSize??10,codec=options.codec??"h264",res=options.resolution??"1080p",fps=options.fps??30,ej:ExportJob[]=[];
  for(let i=0;i<shotIds.length;i+=cs){const ch=shotIds.slice(i,i+cs);ej.push(processVideoExport(createExportJob("video",{projectId,shotIds:ch,format,codec:codec as "h264"|"h265"|"av1"|"vp9",resolution:res,fps})));}
  return{batchId,projectId,jobs:ej,totalShots:shotIds.length,format,createdAt:new Date().toISOString()};
}

export interface ExportPreset { name:string;label:string;format:string;codec:string;resolution:string;fps:number;bitrate_hint:string;description:string; }
const EXPORT_PRESETS: ExportPreset[] = [
  {name:"web_optimized",label:"Web Optimized",format:"mp4",codec:"h264",resolution:"1080p",fps:30,bitrate_hint:"10000 kbps",description:"Best for web playback"},
  {name:"broadcast_quality",label:"Broadcast Quality",format:"mov",codec:"h265",resolution:"4k",fps:24,bitrate_hint:"18000 kbps",description:"Professional broadcast standard"},
  {name:"archive",label:"Archive",format:"mov",codec:"h265",resolution:"4k",fps:60,bitrate_hint:"35000 kbps",description:"Maximum quality archival"},
  {name:"mobile",label:"Mobile",format:"mp4",codec:"h264",resolution:"720p",fps:30,bitrate_hint:"5000 kbps",description:"Optimized for mobile"},
  {name:"social_media",label:"Social Media",format:"mp4",codec:"h264",resolution:"1080p",fps:30,bitrate_hint:"8000 kbps",description:"Tuned for social platforms"},
];
export function getPresets(): ExportPreset[] { return EXPORT_PRESETS; }
export function getPresetByName(n:string): ExportPreset|undefined { return EXPORT_PRESETS.find(p=>p.name===n); }

export interface WatermarkConfig { text?:string;imageUrl?:string;position:"top-left"|"top-right"|"bottom-left"|"bottom-right"|"center";opacity:number;scale:number; }
export function addWatermark(exportId:string, wc:WatermarkConfig) {
  const j=jobs.get(exportId);if(!j)throw new Error("Not found");if(j.status!=="completed")throw new Error("Incomplete");
  if(!wc.text&&!wc.imageUrl)throw new Error("Need text or imageUrl");
  return{exportId,watermarkApplied:true,config:{...wc,opacity:Math.max(0,Math.min(1,wc.opacity)),scale:Math.max(0.05,Math.min(0.5,wc.scale))},outputUrl:j.outputUrl!.replace("/exports/","/exports/watermarked/"),appliedAt:new Date().toISOString()};
}

export interface MetadataPayload { title?:string;artist?:string;description?:string;copyright?:string;creationDate?:string;software?:string;projectName?:string;tags?:string[];customFields?:Record<string,string>; }
export function embedMetadata(exportId:string, md:MetadataPayload) {
  const j=jobs.get(exportId);if(!j)throw new Error("Not found");if(j.status!=="completed")throw new Error("Incomplete");
  const f:Record<string,string>={};if(md.title)f["dc:title"]=md.title;if(md.artist)f["dc:creator"]=md.artist;if(md.description)f["dc:description"]=md.description;
  if(md.copyright)f["dc:rights"]=md.copyright;if(md.tags)f["dc:subject"]=md.tags.join(", ");
  return{exportId,embedded:true,format:(j.type==="video"||j.type==="audio"?"xmp":"exif") as "exif"|"xmp",fields:f,embeddedAt:new Date().toISOString()};
}

export function getExportProgress(jobId:string) {
  const j=jobs.get(jobId);if(!j)throw new Error("Not found");
  const el=Date.now()-new Date(j.createdAt).getTime();let eta:string|null=null;
  if(j.progress>0&&j.progress<100)eta=new Date(Date.now()+((el/j.progress)*100)-el).toISOString();
  return{jobId,stage:j.status==="completed"?"done":j.status,percent:j.progress,eta,startedAt:j.createdAt,elapsedMs:el};
}

export async function getExportHistory(projectId:string) {
  const e:{id:string;type:ExportJob["type"];status:string;format:string;fileSize:number|null;outputUrl:string|null;createdAt:string;completedAt:string|null}[]=[];
  for(const j of jobs.values()){const p=j.params as Record<string,unknown>;if(p.projectId===projectId)e.push({id:j.id,type:j.type,status:j.status,format:(p.format as string)??"unknown",fileSize:j.fileSize,outputUrl:j.outputUrl,createdAt:j.createdAt,completedAt:j.completedAt});}
  return e.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}

export async function deleteExport(exportId:string) { const j=jobs.get(exportId);if(!j)throw new Error("Not found");jobs.delete(exportId);return{deleted:true,id:exportId}; }

export function estimateExportCost(p:{type:ExportJob["type"];format:string;shotCount:number;resolution?:string;codec?:string;includeAssets?:boolean}) {
  let sz=0,ec=0,dur=0;
  switch(p.type){
    case"video":{const br=getBitrate(p.codec??"h264",p.resolution??"1080p");sz=Math.round((br*p.shotCount*5)/8)*1000;ec=Math.ceil(p.shotCount*(p.resolution==="4k"?3:1));dur=Math.ceil(p.shotCount*(p.resolution==="4k"?8:3));break;}
    case"audio":{const m:Record<string,number>={wav:1411,mp3:320,aac:256,opus:128};sz=Math.round(((m[p.format]??256)*p.shotCount*5)/8)*1000;ec=Math.ceil(p.shotCount*0.5);dur=Math.ceil(p.shotCount);break;}
    case"project":{sz=50000000+(p.includeAssets?200000000:0);ec=p.includeAssets?5:2;dur=p.includeAssets?30:10;break;}
    case"avatar":{const m:Record<string,number>={gltf:15e6,usd:20e6,fbx:25e6,bvh:5e5,arkit:8e6};sz=m[p.format]??10e6;ec=2;dur=5;break;}
  }
  const sc=Math.ceil(sz/(100*1024*1024)),cc=Math.ceil(sz/(500*1024*1024));
  let sl:string;if(sz>=1e9)sl=(sz/1e9).toFixed(1)+" GB";else if(sz>=1e6)sl=(sz/1e6).toFixed(1)+" MB";else sl=(sz/1e3).toFixed(1)+" KB";
  return{size_estimate_bytes:sz,size_estimate_label:sl,credits:ec+sc+cc,duration_estimate_seconds:dur,breakdown:{encoding_credits:ec,storage_credits:sc,cdn_credits:cc}};
}
