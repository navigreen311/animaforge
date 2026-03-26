import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// DELETE /api/assets/bulk
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  let body: { assetIds?: string[] };

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

  return NextResponse.json({
    deletedCount: body.assetIds.length,
    deletedIds: body.assetIds,
  });
}
