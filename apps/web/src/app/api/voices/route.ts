import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const voices = [
    { id: 'voice_001', name: 'Aria (Female, Warm)' },
    { id: 'voice_002', name: 'Marcus (Male, Deep)' },
    { id: 'voice_003', name: 'Luna (Female, Energetic)' },
    { id: 'voice_004', name: 'Theo (Male, Neutral)' },
  ];

  return NextResponse.json({ voices, total: voices.length });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    sampleUrl?: string;
  };

  const newVoice = {
    voiceId: 'voice_new',
    name: body.name ?? 'Custom Voice',
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ voice: newVoice }, { status: 201 });
}
