import { NextRequest, NextResponse } from 'next/server';

const MOCK_MATCHES = [
  {
    id: 'pm_1',
    outputId: 'out_42',
    userId: 'user_1',
    platform: 'youtube',
    matchUrl: 'https://youtube.com/watch?v=fakeid1',
    matchStrength: 0.94,
    watermarkFound: true,
    status: 'pending',
    detectedAt: new Date(Date.now() - 3600_000).toISOString(),
    reviewedAt: null,
  },
  {
    id: 'pm_2',
    outputId: 'out_17',
    userId: 'user_1',
    platform: 'reddit',
    matchUrl: 'https://reddit.com/r/x/comments/abc',
    matchStrength: 0.78,
    watermarkFound: false,
    status: 'reviewing',
    detectedAt: new Date(Date.now() - 7200_000).toISOString(),
    reviewedAt: null,
  },
  {
    id: 'pm_3',
    outputId: 'out_88',
    userId: 'user_1',
    platform: 'telegram',
    matchUrl: 'https://t.me/channel/123',
    matchStrength: 0.99,
    watermarkFound: true,
    status: 'confirmed',
    detectedAt: new Date(Date.now() - 86400_000).toISOString(),
    reviewedAt: new Date(Date.now() - 43200_000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  let matches = [...MOCK_MATCHES];
  if (status) matches = matches.filter((m) => m.status === status);
  return NextResponse.json({ matches, total: matches.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    {
      scan: {
        id: `scan_${Math.random().toString(36).slice(2, 10)}`,
        outputId: body.outputId ?? 'out_unknown',
        status: 'queued',
        queuedAt: new Date().toISOString(),
      },
    },
    { status: 202 },
  );
}
