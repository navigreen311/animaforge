import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  POST /api/team/presence/heartbeat                                 */
/*  Record a presence heartbeat for the current user                  */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPage } = body as { currentPage: string };

    if (!currentPage) {
      return NextResponse.json(
        { error: 'currentPage is required' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      currentPage,
      recordedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
