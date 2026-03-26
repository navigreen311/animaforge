import { NextRequest, NextResponse } from 'next/server';

const MOCK_BRAND_KITS = [
  {
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
    createdAt: '2025-11-01T08:00:00.000Z',
    updatedAt: '2026-03-20T14:30:00.000Z',
  },
  {
    id: 'bk_002',
    name: 'Client: Hero Corp',
    isDefault: false,
    logo: '/logos/hero-corp.svg',
    colors: {
      primary: '#dc2626',
      secondary: '#1d4ed8',
      accent: '#facc15',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#94a3b8',
    },
    fonts: {
      heading: { family: 'Montserrat', weight: 800, category: 'sans-serif' },
      body: { family: 'Open Sans', weight: 400, category: 'sans-serif' },
      caption: { family: 'Roboto', weight: 500, category: 'sans-serif' },
    },
    voice: {
      tone: 'heroic-inspirational',
      personality: ['courageous', 'trustworthy', 'energetic'],
      vocabulary: 'mainstream',
      formality: 'casual',
      tagline: 'Be the Hero of Your Story',
    },
    projectCount: 5,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-03-18T09:15:00.000Z',
  },
  {
    id: 'bk_003',
    name: 'Client: Luna Films',
    isDefault: false,
    logo: '/logos/luna-films.svg',
    colors: {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      accent: '#a3e635',
      background: '#0c0a1d',
      surface: '#1e1b3a',
      text: '#f1f5f9',
      muted: '#6b7280',
    },
    fonts: {
      heading: { family: 'Playfair Display', weight: 700, category: 'serif' },
      body: { family: 'Lato', weight: 400, category: 'sans-serif' },
      caption: { family: 'Nunito', weight: 500, category: 'sans-serif' },
    },
    voice: {
      tone: 'cinematic-elegant',
      personality: ['artistic', 'mysterious', 'refined'],
      vocabulary: 'literary',
      formality: 'formal',
      tagline: 'Stories Written in Moonlight',
    },
    projectCount: 3,
    createdAt: '2026-02-10T12:00:00.000Z',
    updatedAt: '2026-03-22T16:45:00.000Z',
  },
];

export async function GET() {
  return NextResponse.json({
    brandKits: MOCK_BRAND_KITS,
    total: MOCK_BRAND_KITS.length,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, colors, fonts, voice } = body as {
    name?: string;
    colors?: Record<string, string>;
    fonts?: Record<string, unknown>;
    voice?: Record<string, unknown>;
  };

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const newKit = {
    id: `bk_${Date.now()}`,
    name: name.trim(),
    isDefault: false,
    logo: null,
    colors: colors ?? {
      primary: '#7c3aed',
      secondary: '#06b6d4',
      accent: '#f59e0b',
      background: '#0a0a0f',
      surface: '#1a1a2e',
      text: '#e2e8f0',
      muted: '#64748b',
    },
    fonts: fonts ?? {
      heading: { family: 'Inter', weight: 700, category: 'sans-serif' },
      body: { family: 'Inter', weight: 400, category: 'sans-serif' },
      caption: { family: 'Inter', weight: 500, category: 'sans-serif' },
    },
    voice: voice ?? {
      tone: 'neutral',
      personality: [],
      vocabulary: 'general',
      formality: 'semi-formal',
      tagline: '',
    },
    projectCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ brandKit: newKit }, { status: 201 });
}
