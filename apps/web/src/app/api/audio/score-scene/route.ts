import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, shotIds, genre, mood, bpm } = body as {
    projectId?: string;
    shotIds?: string[];
    genre?: string;
    mood?: string;
    bpm?: number;
  };

  if (!projectId || !shotIds || shotIds.length === 0) {
    return NextResponse.json(
      { error: 'projectId and shotIds are required' },
      { status: 400 },
    );
  }

  const result = {
    trackId: `track_${Date.now()}`,
    audioUrl: '/mock-scene-score.mp3',
    duration: 84,
    genre: genre ?? 'cinematic',
    mood: mood ?? 'dramatic',
    bpm: bpm ?? 120,
    beatMap: [
      { timecodeMs: 0, type: 'downbeat' },
      { timecodeMs: 2000, type: 'beat' },
      { timecodeMs: 4000, type: 'hit' },
      { timecodeMs: 8000, type: 'downbeat' },
      { timecodeMs: 12000, type: 'beat' },
      { timecodeMs: 16000, type: 'hit' },
    ],
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    projectId,
    shotIds,
  };

  return NextResponse.json(result, { status: 201 });
}
