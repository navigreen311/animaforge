import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  DELETE /api/team/invitations/[id]                                 */
/*  Revoke a pending invitation                                      */
/* ------------------------------------------------------------------ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  /* In production, verify the invitation exists and belongs to the team */
  if (!id.startsWith('inv_')) {
    return NextResponse.json(
      { error: `Invitation "${id}" not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `Invitation "${id}" has been revoked`,
    revokedAt: new Date().toISOString(),
  });
}
