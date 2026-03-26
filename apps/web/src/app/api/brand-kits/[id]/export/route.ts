import { NextRequest, NextResponse } from 'next/server';

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
  const format = (body as { format?: string }).format ?? 'pdf';

  return NextResponse.json({
    downloadUrl: '/mock-style-guide.pdf',
    format,
    kitName: 'AnimaForge Studio',
    kitId: id,
    generatedAt: new Date().toISOString(),
  });
}
