import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { logoUrl } = body as { logoUrl?: string };

  if (!logoUrl || logoUrl.trim().length === 0) {
    return NextResponse.json(
      { error: 'logoUrl is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    logoUrl,
    colors: ['#7c3aed', '#06b6d4', '#f59e0b', '#e2e8f0', '#0a0a0f'],
    confidence: [0.95, 0.82, 0.71, 0.68, 0.55],
    extractedAt: new Date().toISOString(),
  });
}
