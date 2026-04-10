import { NextRequest, NextResponse } from 'next/server';

const MOCK_EVENTS = [
  {
    id: 'evt_1',
    projectId: 'proj_1',
    userId: 'user_1',
    title: 'Storyboard review',
    type: 'milestone',
    startDate: new Date(Date.now() + 86400_000).toISOString(),
    endDate: new Date(Date.now() + 90000_000).toISOString(),
    ownerId: 'user_2',
    status: 'pending',
    description: 'Review Act 1 boards',
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: 'evt_2',
    projectId: 'proj_1',
    userId: 'user_1',
    title: 'VO recording',
    type: 'task',
    startDate: new Date(Date.now() + 172800_000).toISOString(),
    endDate: new Date(Date.now() + 180000_000).toISOString(),
    ownerId: 'user_3',
    status: 'in_progress',
    description: null,
    createdAt: new Date(Date.now() - 172800_000).toISOString(),
  },
  {
    id: 'evt_3',
    projectId: 'proj_2',
    userId: 'user_1',
    title: 'Final render',
    type: 'deadline',
    startDate: new Date(Date.now() + 604800_000).toISOString(),
    endDate: new Date(Date.now() + 608400_000).toISOString(),
    ownerId: null,
    status: 'pending',
    description: 'Delivery to client',
    createdAt: new Date(Date.now() - 259200_000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get('projectId');
  let events = [...MOCK_EVENTS];
  if (projectId) events = events.filter((e) => e.projectId === projectId);
  return NextResponse.json({ events, total: events.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const event = {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    projectId: body.projectId ?? null,
    userId: body.userId ?? 'user_1',
    title: body.title ?? 'Untitled',
    type: body.type ?? 'task',
    startDate: body.startDate ?? new Date().toISOString(),
    endDate: body.endDate ?? new Date(Date.now() + 3600_000).toISOString(),
    ownerId: body.ownerId ?? null,
    status: 'pending',
    description: body.description ?? null,
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json({ event }, { status: 201 });
}
