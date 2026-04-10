import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/brand-kits/:id/sonic
// Attach/generate a sonic branding audio asset for a brand kit (mock)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !id.startsWith('bk_')) {
    return NextResponse.json(
      { error: 'Brand kit not found' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { name } = body as { name?: string };

  return NextResponse.json({
    sonicBrandingUrl: `https://cdn.mock/brand-kits/${id}/sonic.mp3`,
    sonicBrandingName: name ?? 'Signature Sonic Logo',
    kitId: id,
    duration: 4,
    createdAt: new Date().toISOString(),
  });
}
