import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock Asset Data
// ---------------------------------------------------------------------------

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | '3d-model' | 'video';
  category: string;
  sizeBytes: number;
  rights: 'uploaded' | 'ai-generated' | 'licensed';
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

const MOCK_ASSETS: Asset[] = [
  {
    id: 'asset_001',
    name: 'hero_pose_v2.png',
    type: 'image',
    category: 'Characters',
    sizeBytes: 2_516_582, // 2.4 MB
    rights: 'uploaded',
    tags: ['hero', 'pose', 'character'],
    usageCount: 14,
    createdAt: '2026-02-10T08:30:00Z',
    updatedAt: '2026-03-20T11:15:00Z',
    metadata: { width: 2048, height: 2048, format: 'png', colorSpace: 'sRGB' },
  },
  {
    id: 'asset_002',
    name: 'explosion_sfx.wav',
    type: 'audio',
    category: 'Props',
    sizeBytes: 873_267, // 856 KB
    rights: 'licensed',
    tags: ['explosion', 'sfx', 'action'],
    usageCount: 9,
    createdAt: '2026-01-15T14:00:00Z',
    updatedAt: '2026-01-15T14:00:00Z',
    metadata: { duration: 3.2, sampleRate: 48000, channels: 2, bitDepth: 24 },
  },
  {
    id: 'asset_003',
    name: 'kai_model.glb',
    type: '3d-model',
    category: 'Characters',
    sizeBytes: 13_421_773, // 12.8 MB
    rights: 'ai-generated',
    tags: ['kai', 'character', '3d', 'rigged'],
    usageCount: 22,
    createdAt: '2026-02-28T09:45:00Z',
    updatedAt: '2026-03-18T16:30:00Z',
    metadata: { polyCount: 45_200, format: 'glb', hasAnimations: true, boneCount: 68 },
  },
  {
    id: 'asset_004',
    name: 'background_loop.mp4',
    type: 'video',
    category: 'Backgrounds',
    sizeBytes: 35_862_102, // 34.2 MB
    rights: 'uploaded',
    tags: ['background', 'loop', 'ambient'],
    usageCount: 5,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    metadata: { width: 1920, height: 1080, duration: 30, fps: 30, codec: 'h264' },
  },
  {
    id: 'asset_005',
    name: 'watercolor_texture.png',
    type: 'image',
    category: 'Textures',
    sizeBytes: 5_347_738, // 5.1 MB
    rights: 'ai-generated',
    tags: ['watercolor', 'texture', 'painterly'],
    usageCount: 18,
    createdAt: '2026-02-20T12:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
    metadata: { width: 4096, height: 4096, format: 'png', colorSpace: 'sRGB' },
  },
  {
    id: 'asset_006',
    name: 'footsteps_gravel.wav',
    type: 'audio',
    category: 'Props',
    sizeBytes: 1_258_291, // 1.2 MB
    rights: 'licensed',
    tags: ['footsteps', 'gravel', 'foley'],
    usageCount: 11,
    createdAt: '2026-01-28T16:30:00Z',
    updatedAt: '2026-01-28T16:30:00Z',
    metadata: { duration: 8.5, sampleRate: 44100, channels: 1, bitDepth: 16 },
  },
  {
    id: 'asset_007',
    name: 'luna_rig.glb',
    type: '3d-model',
    category: 'Characters',
    sizeBytes: 19_184_652, // 18.3 MB
    rights: 'uploaded',
    tags: ['luna', 'character', '3d', 'rigged'],
    usageCount: 30,
    createdAt: '2026-03-05T07:00:00Z',
    updatedAt: '2026-03-22T14:45:00Z',
    metadata: { polyCount: 62_800, format: 'glb', hasAnimations: true, boneCount: 92 },
  },
  {
    id: 'asset_008',
    name: 'title_animation.mp4',
    type: 'video',
    category: 'Props',
    sizeBytes: 9_122_611, // 8.7 MB
    rights: 'ai-generated',
    tags: ['title', 'animation', 'intro'],
    usageCount: 7,
    createdAt: '2026-03-12T11:30:00Z',
    updatedAt: '2026-03-12T11:30:00Z',
    metadata: { width: 1920, height: 1080, duration: 5, fps: 60, codec: 'h264' },
  },
];

// ---------------------------------------------------------------------------
// GET /api/assets
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const sort = searchParams.get('sort');
  const search = searchParams.get('search');

  let results = [...MOCK_ASSETS];

  // Filter by type
  if (type) {
    results = results.filter((a) => a.type === type);
  }

  // Filter by category
  if (category) {
    results = results.filter(
      (a) => a.category.toLowerCase() === category.toLowerCase(),
    );
  }

  // Search by name or tags
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  // Sort
  if (sort) {
    switch (sort) {
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size':
        results.sort((a, b) => b.sizeBytes - a.sizeBytes);
        break;
      case 'usage':
        results.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'newest':
        results.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'oldest':
        results.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      default:
        break;
    }
  }

  return NextResponse.json({
    assets: results,
    total: results.length,
    filters: { type, category, sort, search },
  });
}

// ---------------------------------------------------------------------------
// POST /api/assets
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { assets?: unknown[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.assets || !Array.isArray(body.assets) || body.assets.length === 0) {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "assets" array' },
      { status: 400 },
    );
  }

  const requiredFields = ['name', 'type', 'category', 'sizeBytes', 'rights'];

  const errors: string[] = [];
  const created: Asset[] = [];

  for (let i = 0; i < body.assets.length; i++) {
    const raw = body.assets[i] as Record<string, unknown>;
    const missing = requiredFields.filter((f) => !(f in raw));
    if (missing.length > 0) {
      errors.push(`Asset[${i}] missing fields: ${missing.join(', ')}`);
      continue;
    }

    const asset: Asset = {
      id: `asset_${Date.now()}_${i}`,
      name: String(raw.name),
      type: raw.type as Asset['type'],
      category: String(raw.category),
      sizeBytes: Number(raw.sizeBytes),
      rights: raw.rights as Asset['rights'],
      tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: (raw.metadata as Record<string, unknown>) ?? {},
    };

    created.push(asset);
  }

  if (errors.length > 0 && created.length === 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  return NextResponse.json(
    { assets: created, createdCount: created.length, errors },
    { status: 201 },
  );
}
