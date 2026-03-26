import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, shotIds, settings } = body as {
    projectId?: string;
    shotIds?: string[];
    settings?: Record<string, unknown>;
  };

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 },
    );
  }

  const appliedCount = shotIds?.length ?? 9;

  return NextResponse.json({
    projectId,
    shotIds: shotIds ?? null,
    settings: settings ?? {},
    appliedCount,
    message: 'Cartoon Pro applied',
  });
}
