import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const photos = formData.getAll('photos');
  const name = formData.get('name') as string | null;
  const styleMode = formData.get('styleMode') as string | null;
  const consent = formData.get('consent') as string | null;

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 },
    );
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json(
      { error: 'At least one photo is required' },
      { status: 400 },
    );
  }

  if (consent !== 'true') {
    return NextResponse.json(
      { error: 'Consent must be granted to create a digital twin' },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      characterId: 'char_new_twin',
      jobId: 'job_twin',
      estimatedSeconds: 45,
    },
    { status: 202 },
  );
}
