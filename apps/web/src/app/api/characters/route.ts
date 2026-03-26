import { NextRequest, NextResponse } from 'next/server';
import { MOCK_CHARACTERS, MOCK_CHARACTER_STATS } from '@/lib/mockData';
import type { Character, StyleMode } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    characters: MOCK_CHARACTERS,
    stats: MOCK_CHARACTER_STATS,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, styleMode, projectId } = body as {
    name?: string;
    description?: string;
    styleMode?: string;
    projectId?: string;
  };

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const newCharacter: Character = {
    id: `char_${Date.now()}`,
    name: name.trim(),
    description: description?.trim() ?? '',
    styleMode: (styleMode as StyleMode) ?? 'realistic',
    status: 'draft',
    isDigitalTwin: false,
    sourcePhotos: [],
    projectIds: projectId ? [projectId] : [],
    avatarColor: '#7c3aed',
    shotCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({ character: newCharacter }, { status: 201 });
}
