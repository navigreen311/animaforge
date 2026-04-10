import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/assets/:id/use-in-shot
// Attach an asset to a shot (mock)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { shotId?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.shotId || typeof body.shotId !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a "shotId" string' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    assetId: id,
    shotId: body.shotId,
    projectId: body.projectId ?? null,
    attachedAt: new Date().toISOString(),
  });
}
