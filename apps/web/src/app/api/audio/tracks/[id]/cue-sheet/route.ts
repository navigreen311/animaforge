import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json({
    downloadUrl: '/mock-cue-sheet.pdf',
    format: 'pdf',
    trackId: id,
  });
}
