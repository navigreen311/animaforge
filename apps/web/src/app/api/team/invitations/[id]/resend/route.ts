import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  POST /api/team/invitations/[id]/resend                            */
/*  Resend a pending invitation email                                 */
/* ------------------------------------------------------------------ */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id.startsWith('inv_')) {
    return NextResponse.json(
      { error: `Invitation "${id}" not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    invitationId: id,
    sentAt: new Date().toISOString(),
  });
}
