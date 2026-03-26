import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/assets/bulk-download
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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
    downloadUrl: '/mock-bulk.zip',
    count: body.assetIds.length,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}
