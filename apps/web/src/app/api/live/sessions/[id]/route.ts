import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = {
    id: params.id,
    userId: 'user_1',
    avatarId: 'avatar_alpha',
    status: 'live',
    destinations: ['twitch', 'youtube'],
    startedAt: new Date(Date.now() - 3600_000).toISOString(),
    endedAt: null,
    viewerPeak: 1284,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    metrics: {
      currentViewers: 842,
      bitrate: 6000,
      fps: 60,
      droppedFrames: 3,
    },
  };
  return NextResponse.json({ session });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json().catch(() => ({}));
  const action = body.action as 'start' | 'stop' | undefined;
  const status =
    action === 'start' ? 'live' : action === 'stop' ? 'offline' : 'idle';
  return NextResponse.json({
    session: {
      id: params.id,
      status,
      startedAt: action === 'start' ? new Date().toISOString() : null,
      endedAt: action === 'stop' ? new Date().toISOString() : null,
    },
  });
}
