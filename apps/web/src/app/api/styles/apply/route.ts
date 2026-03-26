import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { styleId, projectId, shotIds, strength, blend } = body as {
    styleId?: string;
    projectId?: string;
    shotIds?: string[];
    strength?: number;
    blend?: number;
  };

  if (!styleId) {
    return NextResponse.json(
      { error: 'styleId is required' },
      { status: 400 },
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 },
    );
  }

  const appliedCount = shotIds?.length ?? 9;

  return NextResponse.json({
    jobId: `style_job_${Date.now()}`,
    styleId,
    projectId,
    shotIds: shotIds ?? null,
    strength: strength ?? 1.0,
    blend: blend ?? 0.5,
    appliedCount,
    message: `Applying style to ${appliedCount} shots`,
  });
}
