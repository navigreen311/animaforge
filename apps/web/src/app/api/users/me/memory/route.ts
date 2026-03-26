import { NextRequest, NextResponse } from 'next/server';

const MOCK_MEMORY = {
  categories: {
    camera: true,
    style: true,
    prompts: true,
    characters: true,
    brand: false,
  },
  summary:
    'Prefers wide shots with cinematic lighting. Frequently uses noir style palettes. Favors slow dolly movements and atmospheric fog. Default character design leans toward stylized realism.',
  lastUpdated: '2026-03-22T18:45:00Z',
};

export async function GET() {
  return NextResponse.json(MOCK_MEMORY);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { categories } = body as { categories?: Record<string, boolean> };

  if (!categories || typeof categories !== 'object') {
    return NextResponse.json(
      { error: 'categories object is required' },
      { status: 400 },
    );
  }

  const updatedCategories = { ...MOCK_MEMORY.categories };

  for (const [key, value] of Object.entries(categories)) {
    if (key in updatedCategories && typeof value === 'boolean') {
      (updatedCategories as Record<string, boolean>)[key] = value;
    }
  }

  return NextResponse.json({
    categories: updatedCategories,
    summary: MOCK_MEMORY.summary,
    lastUpdated: new Date().toISOString(),
  });
}

export async function DELETE() {
  return NextResponse.json({
    message: 'Memory reset',
    clearedAt: new Date().toISOString(),
  });
}
