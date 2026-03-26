import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { characterId, text, style, speed, pitch, language } = body as {
    characterId?: string;
    text?: string;
    style?: string;
    speed?: number;
    pitch?: number;
    language?: string;
  };

  if (!text || !style) {
    return NextResponse.json(
      { error: 'text and style are required' },
      { status: 400 },
    );
  }

  const track = {
    trackId: `track_${Date.now()}`,
    name: `Voice - ${style}`,
    audioUrl: '/mock-voice.mp3',
    duration: Math.ceil(text.length * 0.06),
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 60 + 10),
    type: 'voice' as const,
    characterId: characterId ?? null,
    speed: speed ?? 1.0,
    pitch: pitch ?? 1.0,
    language: language ?? 'en',
  };

  return NextResponse.json(track, { status: 201 });
}
