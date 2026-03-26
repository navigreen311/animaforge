import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/content-performance                            */
/* ------------------------------------------------------------------ */
export async function GET(_request: NextRequest) {
  const platforms = [
    { name: 'YouTube', connected: false },
    { name: 'TikTok', connected: false },
    { name: 'Meta', connected: false },
  ];

  const topVideo = {
    title: 'Cyber Samurai: Origin',
    views: 48000,
    retention: 72,
    engagement: 8.2,
  };

  const retentionByShot = [
    { shot: 1, pct: 100 },
    { shot: 2, pct: 92 },
    { shot: 3, pct: 87 },
    { shot: 4, pct: 71 },
  ];

  return NextResponse.json({
    platforms,
    topVideo,
    retentionByShot,
  });
}
