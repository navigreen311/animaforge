import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/upload/presign
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { filename?: string; contentType?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.filename || typeof body.filename !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a "filename" string' },
      { status: 400 },
    );
  }

  if (!body.contentType || typeof body.contentType !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a "contentType" string' },
      { status: 400 },
    );
  }

  const assetId = `asset_${Date.now()}`;
  const sanitized = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return NextResponse.json({
    uploadUrl: `https://s3.mock/presigned/${assetId}/${sanitized}?ct=${encodeURIComponent(body.contentType)}`,
    assetId,
    publicUrl: `https://cdn.mock/assets/${assetId}/${sanitized}`,
  });
}
