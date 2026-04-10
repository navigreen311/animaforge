import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/assets/:id/download
// Return a mock presigned download URL for a single asset
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Asset id is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    downloadUrl: `https://cdn.mock/assets/${id}/download`,
    assetId: id,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}
