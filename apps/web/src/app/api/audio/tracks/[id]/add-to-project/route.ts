import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { projectId } = body as { projectId?: string };

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Track added to project timeline',
    trackId: id,
    projectId,
  });
}
