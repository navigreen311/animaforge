import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { genre, mood, duration, bpm } = body as {
    genre?: string;
    mood?: string;
    duration?: number;
    bpm?: number;
  };

  if (!genre || !mood) {
    return NextResponse.json(
      { error: 'genre and mood are required' },
      { status: 400 },
    );
  }

  const trackDuration = duration ?? 30;
  const trackBpm = bpm ?? 120;

  const track = {
    trackId: `track_${Date.now()}`,
    name: `${genre} ${mood} Track`,
    audioUrl: '/mock-music.mp3',
    duration: trackDuration,
    bpm: trackBpm,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    type: 'music' as const,
  };

  return NextResponse.json(track, { status: 201 });
}
