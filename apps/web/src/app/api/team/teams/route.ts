import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock teams                                                        */
/* ------------------------------------------------------------------ */
const MOCK_TEAMS = [
  {
    id: 'team_001',
    name: 'Core Animation',
    description: 'Primary animation production team',
    memberCount: 4,
    members: ['mem_001', 'mem_002', 'mem_003', 'mem_005'],
    projects: ['proj_001', 'proj_002'],
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2026-03-10T08:30:00Z',
  },
  {
    id: 'team_002',
    name: 'Review & QA',
    description: 'Quality assurance and shot review team',
    memberCount: 2,
    members: ['mem_002', 'mem_004'],
    projects: ['proj_001', 'proj_003'],
    createdAt: '2025-08-01T14:00:00Z',
    updatedAt: '2026-02-28T16:45:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  GET /api/team/teams                                               */
/*  Return all teams                                                  */
/* ------------------------------------------------------------------ */
export async function GET() {
  return NextResponse.json({
    teams: MOCK_TEAMS,
    total: MOCK_TEAMS.length,
  });
}

/* ------------------------------------------------------------------ */
/*  POST /api/team/teams                                              */
/*  Create a new team                                                 */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, memberIds, projectIds } = body as {
      name: string;
      description?: string;
      memberIds?: string[];
      projectIds?: string[];
    };

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const team = {
      id: `team_${Date.now()}`,
      name,
      description: description ?? '',
      memberCount: memberIds?.length ?? 0,
      members: memberIds ?? [],
      projects: projectIds ?? [],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, team }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
