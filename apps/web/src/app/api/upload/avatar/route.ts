import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // In production, parse the multipart form data and upload to S3/R2:
  // const formData = await request.formData();
  // const file = formData.get('avatar') as File;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Expected multipart/form-data or application/json' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    avatarUrl: '/mock-avatar.jpg',
    uploadedAt: new Date().toISOString(),
  });
}
