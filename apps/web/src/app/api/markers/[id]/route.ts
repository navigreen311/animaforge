import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await request.json()) as {
    isResolved?: boolean;
    text?: string;
  };

  const updatedMarker = {
    id: params.id,
    projectId: 'proj_001',
    timecodeMs: 5000,
    type: 'note',
    text: 'Consider adjusting the lighting in this scene',
    isResolved: false,
    createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...body,
    id: params.id,
  };

  return NextResponse.json({ marker: updatedMarker });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ success: true, markerId: params.id });
}
