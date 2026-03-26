import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock activity entries                                             */
/* ------------------------------------------------------------------ */
function buildMockActivity(memberId: string) {
  const now = Date.now();
  const hour = 3_600_000;

  return [
    {
      id: `act_001_${memberId}`,
      memberId,
      type: 'shot_generated',
      description: 'Generated shot SC-014 for Cyber Samurai: Origin',
      project: { id: 'proj_001', name: 'Cyber Samurai: Origin' },
      timestamp: new Date(now - hour * 1).toISOString(),
    },
    {
      id: `act_002_${memberId}`,
      memberId,
      type: 'shot_approved',
      description: 'Approved shot SC-012 — first-take pass',
      project: { id: 'proj_001', name: 'Cyber Samurai: Origin' },
      timestamp: new Date(now - hour * 3).toISOString(),
    },
    {
      id: `act_003_${memberId}`,
      memberId,
      type: 'login',
      description: 'Signed in from Chrome on macOS',
      metadata: { ip: '192.168.1.42', userAgent: 'Chrome/120' },
      timestamp: new Date(now - hour * 5).toISOString(),
    },
    {
      id: `act_004_${memberId}`,
      memberId,
      type: 'shot_generated',
      description: 'Generated shot ND-007 for Neon Drift',
      project: { id: 'proj_002', name: 'Neon Drift' },
      timestamp: new Date(now - hour * 8).toISOString(),
    },
    {
      id: `act_005_${memberId}`,
      memberId,
      type: 'role_changed',
      description: 'Role changed from viewer to editor',
      metadata: { previousRole: 'viewer', newRole: 'editor', changedBy: 'mem_001' },
      timestamp: new Date(now - hour * 24).toISOString(),
    },
    {
      id: `act_006_${memberId}`,
      memberId,
      type: 'shot_generated',
      description: 'Generated shot AB-003 for Arcane Bloom',
      project: { id: 'proj_003', name: 'Arcane Bloom' },
      timestamp: new Date(now - hour * 26).toISOString(),
    },
    {
      id: `act_007_${memberId}`,
      memberId,
      type: 'shot_approved',
      description: 'Approved shot ND-005 after revision',
      project: { id: 'proj_002', name: 'Neon Drift' },
      timestamp: new Date(now - hour * 30).toISOString(),
    },
    {
      id: `act_008_${memberId}`,
      memberId,
      type: 'login',
      description: 'Signed in from Safari on iOS',
      metadata: { ip: '10.0.0.15', userAgent: 'Safari/17' },
      timestamp: new Date(now - hour * 48).toISOString(),
    },
    {
      id: `act_009_${memberId}`,
      memberId,
      type: 'shot_generated',
      description: 'Generated shot SC-010 for Cyber Samurai: Origin',
      project: { id: 'proj_001', name: 'Cyber Samurai: Origin' },
      timestamp: new Date(now - hour * 52).toISOString(),
    },
    {
      id: `act_010_${memberId}`,
      memberId,
      type: 'role_changed',
      description: 'Joined the team as viewer',
      metadata: { previousRole: null, newRole: 'viewer', changedBy: 'system' },
      timestamp: new Date(now - hour * 72).toISOString(),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  GET /api/team/members/[id]/activity                               */
/*  Return recent activity for a team member                          */
/* ------------------------------------------------------------------ */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const activities = buildMockActivity(id);

  return NextResponse.json({
    memberId: id,
    activities,
    total: activities.length,
  });
}
