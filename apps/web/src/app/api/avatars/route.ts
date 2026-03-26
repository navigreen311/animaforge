import { NextRequest, NextResponse } from 'next/server';

const mockAvatars = [
  {
    id: 'avatar_001',
    name: 'Kai Digital Twin',
    status: 'complete',
    qualityScore: 92,
    createdAt: '2026-03-20T10:30:00Z',
    updatedAt: '2026-03-20T11:45:00Z',
  },
  {
    id: 'avatar_002',
    name: 'Luna Avatar',
    status: 'complete',
    qualityScore: 87,
    createdAt: '2026-03-21T14:00:00Z',
    updatedAt: '2026-03-21T15:20:00Z',
  },
];

export async function GET() {
  return NextResponse.json({ avatars: mockAvatars });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const photos = formData.getAll('photos');
  const name = formData.get('name') as string | null;
  const styleMode = formData.get('styleMode') as string | null;

  if (!name) {
    return NextResponse.json(
      { error: 'name is required' },
      { status: 400 },
    );
  }

  const now = Date.now();

  return NextResponse.json(
    {
      avatarId: `avatar_${now}`,
      jobId: `avjob_${now}`,
      status: 'processing',
      pipelineStep: 'detect',
      name,
      styleMode: styleMode ?? 'realistic',
      photosReceived: photos.length,
    },
    { status: 201 },
  );
}
