import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageUrl, style, strength } = body as {
    imageUrl?: string;
    style?: string;
    strength?: number;
  };

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'imageUrl is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    resultUrl: '/mock-cartoon-result.png',
    style: style ?? 'default',
    strength: strength ?? 0.8,
  });
}
