import { NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock team members                                                 */
/* ------------------------------------------------------------------ */
const MOCK_MEMBERS = [
  {
    id: 'mem_001',
    name: 'Ava Chen',
    email: 'ava.chen@animaforge.io',
    avatar: '/avatars/ava.png',
    role: 'owner',
    status: 'active',
    joinedAt: '2025-06-15T10:00:00Z',
    credits: { used: 1240, limit: 5000 },
    projects: [
      { id: 'proj_001', name: 'Cyber Samurai: Origin', role: 'owner' },
      { id: 'proj_002', name: 'Neon Drift', role: 'owner' },
    ],
  },
  {
    id: 'mem_002',
    name: 'Marcus Rivera',
    email: 'marcus.r@animaforge.io',
    avatar: '/avatars/marcus.png',
    role: 'admin',
    status: 'active',
    joinedAt: '2025-07-22T14:30:00Z',
    credits: { used: 870, limit: 3000 },
    projects: [
      { id: 'proj_001', name: 'Cyber Samurai: Origin', role: 'editor' },
      { id: 'proj_003', name: 'Arcane Bloom', role: 'admin' },
    ],
  },
  {
    id: 'mem_003',
    name: 'Priya Sharma',
    email: 'priya.sharma@animaforge.io',
    avatar: '/avatars/priya.png',
    role: 'editor',
    status: 'away',
    joinedAt: '2025-08-10T09:15:00Z',
    credits: { used: 560, limit: 2000 },
    projects: [
      { id: 'proj_002', name: 'Neon Drift', role: 'editor' },
    ],
  },
  {
    id: 'mem_004',
    name: 'James Okafor',
    email: 'james.o@animaforge.io',
    avatar: '/avatars/james.png',
    role: 'viewer',
    status: 'offline',
    joinedAt: '2025-09-01T16:45:00Z',
    credits: { used: 120, limit: 500 },
    projects: [
      { id: 'proj_001', name: 'Cyber Samurai: Origin', role: 'viewer' },
      { id: 'proj_003', name: 'Arcane Bloom', role: 'viewer' },
    ],
  },
  {
    id: 'mem_005',
    name: 'Luna Park',
    email: 'luna.park@animaforge.io',
    avatar: '/avatars/luna.png',
    role: 'editor',
    status: 'active',
    joinedAt: '2025-09-18T11:20:00Z',
    credits: { used: 340, limit: 2000 },
    projects: [
      { id: 'proj_002', name: 'Neon Drift', role: 'editor' },
      { id: 'proj_003', name: 'Arcane Bloom', role: 'editor' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  GET /api/team/members                                             */
/*  Return all team members                                           */
/* ------------------------------------------------------------------ */
export async function GET() {
  return NextResponse.json({
    members: MOCK_MEMBERS,
    total: MOCK_MEMBERS.length,
  });
}
