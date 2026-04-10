import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    match: {
      id: params.id,
      outputId: 'out_42',
      userId: 'user_1',
      platform: 'youtube',
      matchUrl: 'https://youtube.com/watch?v=fakeid1',
      matchStrength: 0.94,
      watermarkFound: true,
      status: 'pending',
      detectedAt: new Date(Date.now() - 3600_000).toISOString(),
      reviewedAt: null,
      evidence: {
        screenshots: ['https://cdn.example.com/s1.jpg'],
        perceptualHash: 'abc123def456',
        duration: 42,
      },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    match: {
      id: params.id,
      status: body.status ?? 'reviewing',
      reviewedAt: new Date().toISOString(),
    },
  });
}
