import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/assets/tags?q=...
// Return mock tag suggestions filtered by query
// ---------------------------------------------------------------------------

const MOCK_TAGS = [
  'cyberpunk',
  'neon',
  'character',
  'hero',
  'villain',
  'environment',
  'prop',
  'vehicle',
  'creature',
  'fantasy',
  'sci-fi',
  'noir',
  'dystopian',
  'futuristic',
  'medieval',
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.toLowerCase().trim() ?? '';

  const suggestions = q
    ? MOCK_TAGS.filter((tag) => tag.toLowerCase().includes(q)).slice(0, 10)
    : ['cyberpunk', 'neon', 'character'];

  return NextResponse.json({ tags: suggestions });
}
