import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Mock member lookup                                                */
/* ------------------------------------------------------------------ */
const MOCK_MEMBERS: Record<string, { name: string; email: string; role: string }> = {
  mem_001: { name: 'Ava Chen', email: 'ava.chen@animaforge.io', role: 'owner' },
  mem_002: { name: 'Marcus Rivera', email: 'marcus.r@animaforge.io', role: 'admin' },
  mem_003: { name: 'Priya Sharma', email: 'priya.sharma@animaforge.io', role: 'editor' },
  mem_004: { name: 'James Okafor', email: 'james.o@animaforge.io', role: 'viewer' },
  mem_005: { name: 'Luna Park', email: 'luna.park@animaforge.io', role: 'editor' },
};

/* ------------------------------------------------------------------ */
/*  PATCH /api/team/members/[id]                                      */
/*  Update a team member's role or credit settings                    */
/* ------------------------------------------------------------------ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const member = MOCK_MEMBERS[id];

  if (!member) {
    return NextResponse.json(
      { error: `Member "${id}" not found` },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const { role, monthlyCredits, creditLimitAction } = body as {
      role?: string;
      monthlyCredits?: number;
      creditLimitAction?: 'increase' | 'decrease' | 'reset';
    };

    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (monthlyCredits !== undefined) updates.monthlyCredits = monthlyCredits;
    if (creditLimitAction) updates.creditLimitAction = creditLimitAction;

    return NextResponse.json({
      success: true,
      member: {
        id,
        ...member,
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
/*  DELETE /api/team/members/[id]                                     */
/*  Remove a team member                                              */
/* ------------------------------------------------------------------ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const member = MOCK_MEMBERS[id];

  if (!member) {
    return NextResponse.json(
      { error: `Member "${id}" not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `Member "${member.name}" (${id}) has been removed from the team`,
    removedAt: new Date().toISOString(),
  });
}
