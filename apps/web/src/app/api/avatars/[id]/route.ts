import { NextRequest, NextResponse } from 'next/server';

interface AvatarDetail {
  id: string;
  name: string;
  status: string;
  pipelineStep: string;
  styleMode: string;
  polyCount: number;
  textureRes: string;
  rigType: string;
  blendShapes: number;
  qualityScore: number;
  voiceId: string | null;
  appearanceParams: Record<string, unknown>;
  hairParams: Record<string, unknown>;
  wardrobeParams: Record<string, unknown>;
  animationParams: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function getMockAvatar(id: string): AvatarDetail {
  return {
    id,
    name: 'Kai Digital Twin',
    status: 'complete',
    pipelineStep: 'done',
    styleMode: 'realistic',
    polyCount: 45200,
    textureRes: '4096x4096',
    rigType: 'Full Body IK',
    blendShapes: 52,
    qualityScore: 92,
    voiceId: null,
    appearanceParams: {},
    hairParams: {},
    wardrobeParams: {},
    animationParams: {},
    createdAt: '2026-03-20T10:30:00Z',
    updatedAt: '2026-03-20T11:45:00Z',
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const avatar = getMockAvatar(id);
  return NextResponse.json({ avatar });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await request.json();

  const allowedFields = [
    'name',
    'styleMode',
    'voiceId',
    'appearanceParams',
    'hairParams',
    'wardrobeParams',
    'animationParams',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const avatar = {
    ...getMockAvatar(id),
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ avatar });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  // In production this would delete the avatar resource
  void params.id;
  return NextResponse.json({ success: true });
}
