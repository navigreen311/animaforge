import { NextRequest, NextResponse } from 'next/server';
import { MOCK_CHARACTERS } from '@/lib/mockData';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const character = MOCK_CHARACTERS.find((c) => c.id === params.id);

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { projectId } = body as { projectId?: string };

  if (!projectId || projectId.trim().length === 0) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Character linked to project',
  });
}
