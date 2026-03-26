import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'mp3';

  if (format !== 'mp3' && format !== 'wav') {
    return NextResponse.json(
      { error: 'format must be mp3 or wav' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    downloadUrl: `/mock-download.${format}`,
    format,
    trackId: id,
  });
}
