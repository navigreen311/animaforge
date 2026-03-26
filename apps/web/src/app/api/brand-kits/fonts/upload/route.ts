import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { fontName } = body as { fontName?: string };

  const resolvedName = fontName?.trim() || 'Custom Font';

  return NextResponse.json({
    fontId: `font_${Date.now()}`,
    fontName: resolvedName,
    url: '/mock-font.woff2',
    format: 'woff2',
    uploadedAt: new Date().toISOString(),
  });
}
