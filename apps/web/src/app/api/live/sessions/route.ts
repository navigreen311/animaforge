import { NextRequest, NextResponse } from 'next/server';

const MOCK_SESSIONS = [
  {
    id: 'ls_1',
    userId: 'user_1',
    avatarId: 'avatar_alpha',
    status: 'live',
    destinations: ['twitch', 'youtube'],
    startedAt: new Date(Date.now() - 3600_000).toISOString(),
    endedAt: null,
    viewerPeak: 1284,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: 'ls_2',
    userId: 'user_1',
    avatarId: 'avatar_nova',
    status: 'offline',
    destinations: ['youtube'],
    startedAt: new Date(Date.now() - 86400_000).toISOString(),
    endedAt: new Date(Date.now() - 82800_000).toISOString(),
    viewerPeak: 512,
    createdAt: new Date(Date.now() - 90000_000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  let sessions = [...MOCK_SESSIONS];
  if (status) sessions = sessions.filter((s) => s.status === status);
  return NextResponse.json({ sessions, total: sessions.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const session = {
    id: `ls_${Math.random().toString(36).slice(2, 10)}`,
    userId: body.userId ?? 'user_1',
    avatarId: body.avatarId ?? null,
    status: 'idle',
    destinations: body.destinations ?? [],
    startedAt: null,
    endedAt: null,
    viewerPeak: 0,
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json({ session }, { status: 201 });
}
