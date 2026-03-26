import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock single-asset lookup (mirrors main assets list)
// ---------------------------------------------------------------------------

const MOCK_ASSET = {
  id: 'asset_001',
  name: 'hero_pose_v2.png',
  type: 'image' as const,
  category: 'Characters',
  sizeBytes: 2_516_582,
  rights: 'uploaded' as const,
  tags: ['hero', 'pose', 'character'],
  usageCount: 14,
  createdAt: '2026-02-10T08:30:00Z',
  updatedAt: '2026-03-20T11:15:00Z',
  metadata: { width: 2048, height: 2048, format: 'png', colorSpace: 'sRGB' },
  folderId: 'folder_001',
  usage: {
    scenes: [
      { sceneId: 'scene_01', sceneName: 'Opening Battle', usedAt: '2026-03-18T10:00:00Z' },
      { sceneId: 'scene_04', sceneName: 'Hero Reveal', usedAt: '2026-03-19T14:30:00Z' },
    ],
    lastUsed: '2026-03-19T14:30:00Z',
    totalReferences: 14,
  },
};

// ---------------------------------------------------------------------------
// GET /api/assets/:id
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // In a real implementation we'd look up the asset by id
  const asset = { ...MOCK_ASSET, id };

  return NextResponse.json({ asset });
}

// ---------------------------------------------------------------------------
// PATCH /api/assets/:id
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowedFields = ['name', 'tags', 'rights', 'folderId'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: `No valid fields to update. Allowed: ${allowedFields.join(', ')}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    asset: {
      ...MOCK_ASSET,
      id,
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/assets/:id
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return NextResponse.json({ success: true, deletedId: id });
}
