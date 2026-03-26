import { NextRequest, NextResponse } from 'next/server';

const MOCK_STYLE_PACKS = [
  {
    id: 'style_001',
    name: 'Cyberpunk Neon',
    description: 'High-contrast neon-lit urban dystopia with vibrant glows and dark shadows',
    thumbnail: '/styles/cyberpunk-neon.jpg',
    category: 'sci-fi',
    fingerprint: {
      colorPalette: ['#0f0a2e', '#7c3aed', '#06b6d4', '#f59e0b', '#e2e8f0', '#1a1a2e'],
      contrastProfile: { level: 'high', value: 82 },
      grainNoise: { intensity: 15, type: 'digital' },
      colorGrade: 'Teal-magenta split toning',
      cameraMotion: { type: 'Dolly', intensity: 'medium' },
      editingRhythm: { avgCutLength: 2.4, style: 'fast' },
      lensCharacter: { focalLength: 24, aberration: 'medium' },
      confidence: 0.92,
    },
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'style_002',
    name: 'Watercolor Dream',
    description: 'Soft pastel washes with gentle bleeding edges and dreamy atmosphere',
    thumbnail: '/styles/watercolor-dream.jpg',
    category: 'artistic',
    fingerprint: {
      colorPalette: ['#fdf2f8', '#fbcfe8', '#a5b4fc', '#bfdbfe', '#d9f99d', '#fef3c7'],
      contrastProfile: { level: 'low', value: 35 },
      grainNoise: { intensity: 5, type: 'paper' },
      colorGrade: 'Warm pastel desaturation',
      cameraMotion: { type: 'Static', intensity: 'none' },
      editingRhythm: { avgCutLength: 5.8, style: 'slow' },
      lensCharacter: { focalLength: 50, aberration: 'none' },
      confidence: 0.88,
    },
    createdAt: '2026-03-11T14:30:00Z',
    updatedAt: '2026-03-11T14:30:00Z',
  },
  {
    id: 'style_003',
    name: 'Anime Classic',
    description: 'Bold outlines, cel-shaded coloring, and expressive Japanese animation style',
    thumbnail: '/styles/anime-classic.jpg',
    category: 'animation',
    fingerprint: {
      colorPalette: ['#1e293b', '#ef4444', '#3b82f6', '#fbbf24', '#f8fafc', '#6366f1'],
      contrastProfile: { level: 'medium', value: 60 },
      grainNoise: { intensity: 0, type: 'none' },
      colorGrade: 'Saturated cel shading',
      cameraMotion: { type: 'Pan', intensity: 'low' },
      editingRhythm: { avgCutLength: 3.0, style: 'moderate' },
      lensCharacter: { focalLength: 35, aberration: 'none' },
      confidence: 0.95,
    },
    createdAt: '2026-03-12T09:15:00Z',
    updatedAt: '2026-03-12T09:15:00Z',
  },
  {
    id: 'style_004',
    name: 'Film Noir',
    description: 'High-contrast black and white with dramatic shadows and moody lighting',
    thumbnail: '/styles/film-noir.jpg',
    category: 'cinematic',
    fingerprint: {
      colorPalette: ['#0a0a0a', '#1c1c1c', '#3a3a3a', '#6b6b6b', '#a3a3a3', '#e5e5e5'],
      contrastProfile: { level: 'high', value: 90 },
      grainNoise: { intensity: 40, type: 'film' },
      colorGrade: 'Monochrome silver gelatin',
      cameraMotion: { type: 'Crane', intensity: 'low' },
      editingRhythm: { avgCutLength: 4.5, style: 'deliberate' },
      lensCharacter: { focalLength: 40, aberration: 'low' },
      confidence: 0.91,
    },
    createdAt: '2026-03-13T18:45:00Z',
    updatedAt: '2026-03-13T18:45:00Z',
  },
  {
    id: 'style_005',
    name: 'Pixel Retro',
    description: '8-bit and 16-bit inspired pixel art with limited color palette',
    thumbnail: '/styles/pixel-retro.jpg',
    category: 'retro',
    fingerprint: {
      colorPalette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f', '#e0f8d0', '#2c2137'],
      contrastProfile: { level: 'medium', value: 55 },
      grainNoise: { intensity: 0, type: 'none' },
      colorGrade: 'Limited 16-color palette',
      cameraMotion: { type: 'Static', intensity: 'none' },
      editingRhythm: { avgCutLength: 2.0, style: 'snappy' },
      lensCharacter: { focalLength: 50, aberration: 'none' },
      confidence: 0.93,
    },
    createdAt: '2026-03-14T11:20:00Z',
    updatedAt: '2026-03-14T11:20:00Z',
  },
  {
    id: 'style_006',
    name: 'Oil Painting',
    description: 'Rich textured brush strokes with deep colors and classical composition',
    thumbnail: '/styles/oil-painting.jpg',
    category: 'artistic',
    fingerprint: {
      colorPalette: ['#1a0f0a', '#8b4513', '#cd853f', '#daa520', '#f5f5dc', '#2e1503'],
      contrastProfile: { level: 'medium', value: 65 },
      grainNoise: { intensity: 10, type: 'canvas' },
      colorGrade: 'Warm Renaissance tonality',
      cameraMotion: { type: 'Static', intensity: 'none' },
      editingRhythm: { avgCutLength: 6.0, style: 'slow' },
      lensCharacter: { focalLength: 85, aberration: 'low' },
      confidence: 0.89,
    },
    createdAt: '2026-03-15T16:00:00Z',
    updatedAt: '2026-03-15T16:00:00Z',
  },
];

export async function GET() {
  return NextResponse.json({
    styles: MOCK_STYLE_PACKS,
    total: MOCK_STYLE_PACKS.length,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, category, fingerprint } = body as {
    name?: string;
    description?: string;
    category?: string;
    fingerprint?: Record<string, unknown>;
  };

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const newStyle = {
    id: `style_${Date.now()}`,
    name: name.trim(),
    description: description?.trim() ?? '',
    thumbnail: '/styles/custom.jpg',
    category: category ?? 'custom',
    fingerprint: fingerprint ?? null,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ style: newStyle }, { status: 201 });
}
