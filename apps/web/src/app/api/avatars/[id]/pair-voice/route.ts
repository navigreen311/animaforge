import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { voiceId } = body;

  if (!voiceId) {
    return NextResponse.json(
      { error: 'voiceId is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    avatarId: params.id,
    voiceId,
    message: 'Voice paired with avatar',
  });
}
