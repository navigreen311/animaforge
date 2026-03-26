import { NextRequest, NextResponse } from 'next/server';
import { MOCK_CHARACTERS } from '@/lib/mockData';

const VALID_FORMATS = ['gltf', 'fbx', 'usd', 'bvh', 'arkit'] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const character = MOCK_CHARACTERS.find((c) => c.id === params.id);

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 },
    );
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') as ExportFormat | null;

  if (!format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    downloadUrl: `/mock-export/${character.id}.${format}`,
    format,
  });
}
