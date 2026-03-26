import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  PATCH /api/team/members/[id]/projects                             */
/*  Update a member's project access list                             */
/* ------------------------------------------------------------------ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { projectAccess } = body as {
      projectAccess: { projectId: string; hasAccess: boolean; role: string }[];
    };

    if (!projectAccess || !Array.isArray(projectAccess)) {
      return NextResponse.json(
        { error: 'projectAccess array is required' },
        { status: 400 },
      );
    }

    const updated = projectAccess.map((entry) => ({
      projectId: entry.projectId,
      hasAccess: entry.hasAccess,
      role: entry.role,
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      memberId: id,
      projectAccess: updated,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
