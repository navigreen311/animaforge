import { NextRequest, NextResponse } from 'next/server';
import { MOCK_CHARACTERS } from '@/lib/mockData';
import type { Character } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const character = MOCK_CHARACTERS.find((c) => c.id === params.id);

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ character });
}

export async function PATCH(
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

  const body = await request.json();
  const updatedCharacter: Character = {
    ...character,
    ...body,
    id: character.id, // prevent id override
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ character: updatedCharacter });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const character = MOCK_CHARACTERS.find((c) => c.id === params.id);

  if (!character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
