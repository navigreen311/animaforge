import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    scanners: [
      {
        id: 'scanner_youtube',
        platform: 'youtube',
        status: 'healthy',
        lastRunAt: new Date(Date.now() - 600_000).toISOString(),
        matchesFound24h: 12,
        coverage: 0.98,
      },
      {
        id: 'scanner_reddit',
        platform: 'reddit',
        status: 'healthy',
        lastRunAt: new Date(Date.now() - 900_000).toISOString(),
        matchesFound24h: 4,
        coverage: 0.95,
      },
      {
        id: 'scanner_telegram',
        platform: 'telegram',
        status: 'degraded',
        lastRunAt: new Date(Date.now() - 3600_000).toISOString(),
        matchesFound24h: 7,
        coverage: 0.72,
      },
      {
        id: 'scanner_tiktok',
        platform: 'tiktok',
        status: 'healthy',
        lastRunAt: new Date(Date.now() - 300_000).toISOString(),
        matchesFound24h: 19,
        coverage: 0.91,
      },
    ],
  });
}
