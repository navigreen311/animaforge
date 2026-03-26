import { NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock active presence data                                         */
/* ------------------------------------------------------------------ */
const MOCK_PRESENCE = [
  {
    memberId: 'mem_001',
    name: 'Ava Chen',
    avatar: '/avatars/ava.png',
    status: 'active',
    currentPage: '/projects/proj_001/shots',
    lastSeen: new Date(Date.now() - 30_000).toISOString(),
  },
  {
    memberId: 'mem_002',
    name: 'Marcus Rivera',
    avatar: '/avatars/marcus.png',
    status: 'active',
    currentPage: '/projects/proj_003/timeline',
    lastSeen: new Date(Date.now() - 45_000).toISOString(),
  },
  {
    memberId: 'mem_005',
    name: 'Luna Park',
    avatar: '/avatars/luna.png',
    status: 'active',
    currentPage: '/dashboard',
    lastSeen: new Date(Date.now() - 10_000).toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/*  GET /api/team/presence                                            */
/*  Return currently active team members and their locations          */
/* ------------------------------------------------------------------ */
export async function GET() {
  return NextResponse.json({
    activeMembers: MOCK_PRESENCE,
    total: MOCK_PRESENCE.length,
  });
}
