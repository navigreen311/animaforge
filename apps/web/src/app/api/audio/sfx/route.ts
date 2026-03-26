import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description, duration } = body as {
    description?: string;
    duration?: number;
  };

  if (!description) {
    return NextResponse.json(
      { error: 'description is required' },
      { status: 400 },
    );
  }

  const track = {
    trackId: `track_${Date.now()}`,
    name: description,
    audioUrl: '/mock-sfx.mp3',
    duration: duration ?? 5,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 90 + 10),
    type: 'sfx' as const,
  };

  return NextResponse.json(track, { status: 201 });
}
