import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const markers = [
    {
      id: 'marker_1',
      projectId: 'proj_001',
      timecodeMs: 5000,
      type: 'note',
      text: 'Consider adjusting the lighting in this scene',
      isResolved: false,
      createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    },
    {
      id: 'marker_2',
      projectId: 'proj_001',
      timecodeMs: 15000,
      type: 'issue',
      text: 'Character clipping through background object',
      isResolved: false,
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: 'marker_3',
      projectId: 'proj_001',
      timecodeMs: 30000,
      type: 'approved',
      text: 'Final composition approved by director',
      isResolved: true,
      createdAt: new Date(Date.now() - 1_800_000).toISOString(),
    },
  ];

  return NextResponse.json({ markers, total: markers.length });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId?: string;
    timecodeMs?: number;
    type?: string;
    text?: string;
  };

  if (!body.projectId || body.timecodeMs == null || !body.type || !body.text) {
    return NextResponse.json(
      { error: 'projectId, timecodeMs, type, and text are required' },
      { status: 400 },
    );
  }

  const newMarker = {
    id: `marker_${Date.now()}`,
    projectId: body.projectId,
    timecodeMs: body.timecodeMs,
    type: body.type,
    text: body.text,
    isResolved: false,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ marker: newMarker }, { status: 201 });
}
