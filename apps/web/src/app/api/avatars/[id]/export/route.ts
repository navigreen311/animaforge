import { NextRequest, NextResponse } from 'next/server';

const VALID_FORMATS = ['gltf', 'fbx', 'usd', 'bvh', 'arkit', 'mp4'] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') as ExportFormat | null;

  if (!format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      {
        error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    avatarId: params.id,
    downloadUrl: `/mock-avatar-export.${format}`,
    format,
    size: '12.8MB',
  });
}
