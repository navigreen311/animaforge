import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/assets/confirm
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { assetId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assetId || typeof body.assetId !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a valid "assetId" string' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    confirmed: true,
    assetId: body.assetId,
    confirmedAt: new Date().toISOString(),
  });
}
