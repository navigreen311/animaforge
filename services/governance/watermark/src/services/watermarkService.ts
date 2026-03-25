import { v4 as uuidv4 } from "uuid";

export interface WatermarkRecord {
  watermark_id: string;
  job_id: string;
  output_url: string;
  watermarked_url: string;
  watermark_data: Record<string, unknown>;
  embedded_at: string;
}

export interface DetectionResult {
  detected: boolean;
  watermark_id: string | null;
  confidence: number;
  metadata: Record<string, unknown> | null;
}

const watermarkStore = new Map<string, WatermarkRecord>();
const urlIndex = new Map<string, string>(); // watermarked_url -> watermark_id

export function embedWatermark(
  job_id: string,
  output_url: string,
  watermark_data: Record<string, unknown>
): { watermark_id: string; watermarked_url: string } {
  const watermark_id = uuidv4();
  const watermarked_url = `${output_url}?wm=${watermark_id}`;

  const record: WatermarkRecord = {
    watermark_id,
    job_id,
    output_url,
    watermarked_url,
    watermark_data,
    embedded_at: new Date().toISOString(),
  };

  watermarkStore.set(watermark_id, record);
  urlIndex.set(watermarked_url, watermark_id);

  return { watermark_id, watermarked_url };
}

export function detectWatermark(content_url: string): DetectionResult {
  const watermark_id = urlIndex.get(content_url) ?? null;

  if (watermark_id) {
    const record = watermarkStore.get(watermark_id)!;
    return {
      detected: true,
      watermark_id,
      confidence: 0.98,
      metadata: {
        job_id: record.job_id,
        embedded_at: record.embedded_at,
        watermark_data: record.watermark_data,
      },
    };
  }

  return {
    detected: false,
    watermark_id: null,
    confidence: 0.0,
    metadata: null,
  };
}

export function clearStore(): void {
  watermarkStore.clear();
  urlIndex.clear();
}
