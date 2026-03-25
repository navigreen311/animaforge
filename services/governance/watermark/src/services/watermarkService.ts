import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";

export interface WatermarkRecord { watermark_id: string; job_id: string; output_url: string; watermarked_url: string; watermark_data: Record<string, unknown>; content_hash: string; embedded_at: string; }
export interface DetectionResult { detected: boolean; watermark_id: string | null; confidence: number; metadata: Record<string, unknown> | null; }

const watermarkStore = new Map<string, WatermarkRecord>();
const hashIndex = new Map<string, string>();

function computeContentHash(url: string): string { return crypto.createHash("sha256").update(url).digest("hex"); }

async function storeInDb(record: WatermarkRecord): Promise<void> {
  await prisma.auditTrail.create({ data: { userId: "00000000-0000-0000-0000-000000000000", action: "watermark:embed", resource: "watermark", resourceId: record.watermark_id, details: record as unknown as Record<string, unknown> } });
}

async function lookupByContentHash(contentHash: string): Promise<WatermarkRecord | null> {
  const rows = await prisma.auditTrail.findMany({ where: { action: "watermark:embed" }, orderBy: { createdAt: "desc" } });
  for (const row of rows) { const d = row.details as unknown as WatermarkRecord; if (d.content_hash === contentHash) return d; }
  return null;
}

export async function embedWatermark(job_id: string, output_url: string, watermark_data: Record<string, unknown>): Promise<{ watermark_id: string; watermarked_url: string }> {
  const watermark_id = uuidv4(); const watermarked_url = `${output_url}?wm=${watermark_id}`; const content_hash = computeContentHash(watermarked_url);
  const record: WatermarkRecord = { watermark_id, job_id, output_url, watermarked_url, watermark_data, content_hash, embedded_at: new Date().toISOString() };
  try { if (await isPrismaAvailable()) { await storeInDb(record); } else { watermarkStore.set(watermark_id, record); hashIndex.set(content_hash, watermark_id); } } catch { watermarkStore.set(watermark_id, record); hashIndex.set(content_hash, watermark_id); }
  return { watermark_id, watermarked_url };
}

export async function detectWatermark(content_url: string): Promise<DetectionResult> {
  const content_hash = computeContentHash(content_url);
  try { if (await isPrismaAvailable()) { const record = await lookupByContentHash(content_hash); if (record) { return { detected: true, watermark_id: record.watermark_id, confidence: 0.98, metadata: { job_id: record.job_id, embedded_at: record.embedded_at, watermark_data: record.watermark_data } }; } } } catch { /* fall through */ }
  const wmId = hashIndex.get(content_hash) ?? null;
  if (wmId) { const record = watermarkStore.get(wmId)!; return { detected: true, watermark_id: wmId, confidence: 0.98, metadata: { job_id: record.job_id, embedded_at: record.embedded_at, watermark_data: record.watermark_data } }; }
  return { detected: false, watermark_id: null, confidence: 0.0, metadata: null };
}

export function clearStore(): void { watermarkStore.clear(); hashIndex.clear(); }
