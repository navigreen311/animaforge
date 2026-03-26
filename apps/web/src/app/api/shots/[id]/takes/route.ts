import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const takes = [
    {
      id: 'take_3',
      shotId: params.id,
      version: 3,
      isActive: true,
      tier: 'standard',
      qualityScore: 0.82,
      thumbnailUrl: '/mock/takes/take-3-thumb.jpg',
      videoUrl: '/mock/takes/take-3.mp4',
      createdAt: new Date(Date.now() - 1_800_000).toISOString(),
    },
    {
      id: 'take_2',
      shotId: params.id,
      version: 2,
      isActive: false,
      tier: 'preview',
      qualityScore: 0.68,
      thumbnailUrl: '/mock/takes/take-2-thumb.jpg',
      videoUrl: '/mock/takes/take-2.mp4',
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: 'take_1',
      shotId: params.id,
      version: 1,
      isActive: false,
      tier: 'preview',
      qualityScore: 0.54,
      thumbnailUrl: '/mock/takes/take-1-thumb.jpg',
      videoUrl: '/mock/takes/take-1.mp4',
      createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    },
  ];

  return NextResponse.json({ takes, total: takes.length });
}
