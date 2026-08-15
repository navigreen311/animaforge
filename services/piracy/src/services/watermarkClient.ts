/**
 * Client for the governance watermark service.
 *
 * Piracy detection does not re-implement watermark extraction: it asks the
 * service that owns the algorithm. When that service is unreachable the answer
 * is "unknown", never "no watermark" — absence of evidence collected is not
 * evidence of absence.
 */

export interface WatermarkProbe {
  /** null means "we could not check", which is distinct from false. */
  present: boolean | null;
  watermarkId: string | null;
  confidence: number;
  method: string;
  reason: string | null;
}

export interface WatermarkCapability {
  configured: boolean;
  url: string | null;
  detail: string | null;
}

function serviceUrl(): string | null {
  return process.env.WATERMARK_SERVICE_URL ?? null;
}

export function watermarkCapability(): WatermarkCapability {
  const url = serviceUrl();
  return {
    configured: url !== null,
    url,
    detail: url
      ? null
      : 'WATERMARK_SERVICE_URL is not set; piracy scans cannot check for watermarks',
  };
}

/** Ask the watermark service to extract a mark from supplied media. */
export async function detectWatermarkInAsset(asset: {
  asset_base64?: string;
  asset_path?: string;
  mime_type?: string;
}): Promise<WatermarkProbe> {
  const url = serviceUrl();
  if (!url) {
    return {
      present: null,
      watermarkId: null,
      confidence: 0,
      method: 'not-configured',
      reason: watermarkCapability().detail,
    };
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/governance/watermark/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      return {
        present: null,
        watermarkId: null,
        confidence: 0,
        method: 'request-failed',
        reason: `watermark service returned HTTP ${response.status}`,
      };
    }
    const payload = (await response.json()) as {
      detected?: boolean;
      watermark_id?: string | null;
      confidence?: number;
      method?: string;
      reason?: string;
    };
    return {
      present: payload.detected ?? false,
      watermarkId: payload.watermark_id ?? null,
      confidence: payload.confidence ?? 0,
      method: payload.method ?? 'unknown',
      reason: payload.reason ?? null,
    };
  } catch (err) {
    return {
      present: null,
      watermarkId: null,
      confidence: 0,
      method: 'request-failed',
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
