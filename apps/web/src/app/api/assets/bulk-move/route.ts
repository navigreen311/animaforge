import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/assets/bulk-move
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { assetIds?: string[]; folderId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assetIds || !Array.isArray(body.assetIds) || body.assetIds.length === 0) {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "assetIds" array' },
      { status: 400 },
    );
  }

  if (!body.folderId || typeof body.folderId !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a valid "folderId" string' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    movedCount: body.assetIds.length,
    folderId: body.folderId,
  });
}
