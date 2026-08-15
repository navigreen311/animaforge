/**
 * Candidate discovery for web scanning.
 *
 * Finding *where* a copy might be hosted needs a web/video search index, which
 * this repo does not ship and cannot fake. Discovery is therefore pluggable and
 * off by default; when it is off, a scan honestly reports that it examined zero
 * candidates instead of inventing matches.
 *
 * To enable, point the service at any endpoint that accepts
 *   POST { query, platform, limit }
 * and answers
 *   { results: [{ url, title?, thumbnail_url?, media_url? }] }
 *
 *   PIRACY_SEARCH_PROVIDER=http
 *   PIRACY_SEARCH_ENDPOINT=https://your-search-gateway.example/search
 *   PIRACY_SEARCH_API_KEY=YOUR_API_KEY_HERE
 */

export interface Candidate {
  url: string;
  title?: string;
  /** Direct link to the media bytes, when the provider can resolve one. */
  mediaUrl?: string;
  thumbnailUrl?: string;
}

export interface DiscoveryOutcome {
  candidates: Candidate[];
  provider: string;
  /** True when discovery could not actually run. */
  degraded: boolean;
  reason: string | null;
}

export interface SearchCapability {
  provider: string;
  configured: boolean;
  endpoint: string | null;
  detail: string | null;
}

function provider(): string {
  return (process.env.PIRACY_SEARCH_PROVIDER ?? 'none').toLowerCase();
}

export function searchCapability(): SearchCapability {
  const name = provider();
  if (name === 'none') {
    return {
      provider: 'none',
      configured: false,
      endpoint: null,
      detail:
        'No search provider configured. Web scanning cannot discover candidate URLs; ' +
        'set PIRACY_SEARCH_PROVIDER=http, PIRACY_SEARCH_ENDPOINT and PIRACY_SEARCH_API_KEY.',
    };
  }
  const endpoint = process.env.PIRACY_SEARCH_ENDPOINT ?? null;
  if (name === 'http' && !endpoint) {
    return {
      provider: 'http',
      configured: false,
      endpoint: null,
      detail: 'PIRACY_SEARCH_PROVIDER=http but PIRACY_SEARCH_ENDPOINT is not set',
    };
  }
  return { provider: name, configured: true, endpoint, detail: null };
}

export async function discoverCandidates(
  query: string,
  platform: string,
  limit = 20,
): Promise<DiscoveryOutcome> {
  const capability = searchCapability();
  if (!capability.configured) {
    return {
      candidates: [],
      provider: capability.provider,
      degraded: true,
      reason: capability.detail,
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.PIRACY_SEARCH_API_KEY;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(capability.endpoint as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, platform, limit }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return {
        candidates: [],
        provider: capability.provider,
        degraded: true,
        reason: `search provider returned HTTP ${response.status}`,
      };
    }
    const payload = (await response.json()) as {
      results?: Array<{
        url?: string;
        title?: string;
        media_url?: string;
        thumbnail_url?: string;
      }>;
    };
    const candidates: Candidate[] = (payload.results ?? [])
      .filter((r): r is { url: string } & typeof r => typeof r.url === 'string')
      .map((r) => ({
        url: r.url,
        title: r.title,
        mediaUrl: r.media_url,
        thumbnailUrl: r.thumbnail_url,
      }));
    return {
      candidates,
      provider: capability.provider,
      degraded: false,
      reason: null,
    };
  } catch (err) {
    return {
      candidates: [],
      provider: capability.provider,
      degraded: true,
      reason: `search provider request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
