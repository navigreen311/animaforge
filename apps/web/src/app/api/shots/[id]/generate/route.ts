import { NextRequest, NextResponse } from 'next/server';

type GenerateTier = 'preview' | 'standard' | 'premium';

const TIER_ESTIMATES: Record<GenerateTier, number> = {
  preview: 15,
  standard: 45,
  premium: 120,
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { tier, sceneGraph } = (await request.json()) as {
    tier?: GenerateTier;
    sceneGraph?: unknown;
  };

  if (!tier || !TIER_ESTIMATES[tier]) {
    return NextResponse.json(
      { error: 'Invalid tier. Must be one of: preview, standard, premium' },
      { status: 400 },
    );
  }

  if (!sceneGraph) {
    return NextResponse.json(
      { error: 'sceneGraph is required' },
      { status: 400 },
    );
  }

  const jobId = `job_${Date.now()}`;
  const estimatedSeconds = TIER_ESTIMATES[tier];

  return NextResponse.json(
    {
      jobId,
      estimatedSeconds,
      shotId: params.id,
      tier,
    },
    { status: 202 },
  );
}
