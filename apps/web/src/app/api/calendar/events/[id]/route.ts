import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    event: {
      id: params.id,
      projectId: 'proj_1',
      userId: 'user_1',
      title: 'Storyboard review',
      type: 'milestone',
      startDate: new Date(Date.now() + 86400_000).toISOString(),
      endDate: new Date(Date.now() + 90000_000).toISOString(),
      ownerId: 'user_2',
      status: 'pending',
      description: 'Review Act 1 boards',
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    event: {
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ success: true, id: params.id });
}
