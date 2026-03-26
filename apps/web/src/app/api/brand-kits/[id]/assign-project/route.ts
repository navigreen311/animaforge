import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
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

  const body = await request.json();
  const { projectIds } = body as { projectIds?: string[] };

  if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json(
      { error: 'projectIds array is required and must not be empty' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    brandKitId: id,
    assignedCount: projectIds.length,
    projectIds,
    assignedAt: new Date().toISOString(),
  });
}
