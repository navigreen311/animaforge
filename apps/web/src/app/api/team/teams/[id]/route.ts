import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock teams lookup                                                 */
/* ------------------------------------------------------------------ */
const MOCK_TEAMS: Record<string, { name: string; description: string }> = {
  team_001: { name: 'Core Animation', description: 'Primary animation production team' },
  team_002: { name: 'Review & QA', description: 'Quality assurance and shot review team' },
};

/* ------------------------------------------------------------------ */
/*  PATCH /api/team/teams/[id]                                        */
/*  Update a team's details                                           */
/* ------------------------------------------------------------------ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const team = MOCK_TEAMS[id];

  if (!team) {
    return NextResponse.json(
      { error: `Team "${id}" not found` },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const { name, description, memberIds, projectIds } = body as {
      name?: string;
      description?: string;
      memberIds?: string[];
      projectIds?: string[];
    };

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (memberIds) updates.members = memberIds;
    if (projectIds) updates.projects = projectIds;

    return NextResponse.json({
      success: true,
      team: {
        id,
        ...team,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/team/teams/[id]                                       */
/*  Delete a team                                                     */
/* ------------------------------------------------------------------ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const team = MOCK_TEAMS[id];

  if (!team) {
    return NextResponse.json(
      { error: `Team "${id}" not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `Team "${team.name}" (${id}) has been deleted`,
    deletedAt: new Date().toISOString(),
  });
}
