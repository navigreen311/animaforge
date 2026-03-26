import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { name, isFavorite } = body as {
    name?: string;
    isFavorite?: boolean;
  };

  const updatedTrack = {
    trackId: id,
    name: name ?? 'Untitled Track',
    isFavorite: isFavorite ?? false,
    audioUrl: '/mock-music.mp3',
    duration: 120,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    type: 'music' as const,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(updatedTrack);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json({ success: true, deletedTrackId: id });
}
