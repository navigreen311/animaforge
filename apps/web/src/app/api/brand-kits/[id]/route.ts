import { NextRequest, NextResponse } from 'next/server';

const MOCK_BRAND_KIT = {
  id: 'bk_001',
  name: 'AnimaForge Studio',
  isDefault: true,
  logo: '/logos/animaforge-studio.svg',
  colors: {
    primary: '#7c3aed',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    background: '#0a0a0f',
    surface: '#1a1a2e',
    text: '#e2e8f0',
    muted: '#64748b',
  },
  fonts: {
    heading: { family: 'Space Grotesk', weight: 700, category: 'sans-serif' },
    body: { family: 'Inter', weight: 400, category: 'sans-serif' },
    caption: { family: 'DM Sans', weight: 500, category: 'sans-serif' },
  },
  voice: {
    tone: 'professional-creative',
    personality: ['innovative', 'bold', 'approachable'],
    vocabulary: 'technical-but-accessible',
    formality: 'semi-formal',
    tagline: 'Forge the Future of Animation',
  },
  projectCount: 12,
  assignedProjects: ['proj_001', 'proj_002', 'proj_003'],
  createdAt: '2025-11-01T08:00:00.000Z',
  updatedAt: '2026-03-20T14:30:00.000Z',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !id.startsWith('bk_')) {
    return NextResponse.json(
      { error: 'Brand kit not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    brandKit: { ...MOCK_BRAND_KIT, id },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !id.startsWith('bk_')) {
    return NextResponse.json(
      { error: 'Brand kit not found' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const updatedKit = {
    ...MOCK_BRAND_KIT,
    ...body,
    id, // prevent id override
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ brandKit: updatedKit });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id || !id.startsWith('bk_')) {
    return NextResponse.json(
      { error: 'Brand kit not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
