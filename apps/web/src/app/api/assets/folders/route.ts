import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock Folder Data
// ---------------------------------------------------------------------------

interface Folder {
  id: string;
  name: string;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

const MOCK_FOLDERS: Folder[] = [
  {
    id: 'folder_001',
    name: 'Characters',
    assetCount: 12,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-03-20T11:00:00Z',
  },
  {
    id: 'folder_002',
    name: 'Backgrounds',
    assetCount: 8,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'folder_003',
    name: 'Props',
    assetCount: 15,
    createdAt: '2026-01-12T10:00:00Z',
    updatedAt: '2026-03-22T08:45:00Z',
  },
  {
    id: 'folder_004',
    name: 'Textures',
    assetCount: 6,
    createdAt: '2026-02-01T11:00:00Z',
    updatedAt: '2026-03-10T16:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// GET /api/assets/folders
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    folders: MOCK_FOLDERS,
    total: MOCK_FOLDERS.length,
  });
}

// ---------------------------------------------------------------------------
// POST /api/assets/folders
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { name?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "name" string' },
      { status: 400 },
    );
  }

  const folder: Folder = {
    id: `folder_${Date.now()}`,
    name: body.name.trim(),
    assetCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ folder }, { status: 201 });
}
