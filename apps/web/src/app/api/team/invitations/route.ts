import { NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock pending invitations                                          */
/* ------------------------------------------------------------------ */
const MOCK_INVITATIONS = [
  {
    id: 'inv_001',
    email: 'sarah.kim@example.com',
    role: 'editor',
    status: 'pending',
    invitedBy: {
      id: 'mem_001',
      name: 'Ava Chen',
    },
    projectIds: ['proj_001', 'proj_002'],
    creditLimit: 2000,
    message: 'Welcome to the team! Looking forward to collaborating on Cyber Samurai.',
    sentAt: '2026-03-20T14:00:00Z',
    expiresAt: '2026-04-03T14:00:00Z',
  },
  {
    id: 'inv_002',
    email: 'derek.wu@example.com',
    role: 'viewer',
    status: 'pending',
    invitedBy: {
      id: 'mem_002',
      name: 'Marcus Rivera',
    },
    projectIds: ['proj_003'],
    creditLimit: 500,
    sentAt: '2026-03-22T09:30:00Z',
    expiresAt: '2026-04-05T09:30:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  GET /api/team/invitations                                         */
/*  Return all pending invitations                                    */
/* ------------------------------------------------------------------ */
export async function GET() {
  return NextResponse.json({
    invitations: MOCK_INVITATIONS,
    total: MOCK_INVITATIONS.length,
  });
}
