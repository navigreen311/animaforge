import { NextRequest, NextResponse } from 'next/server';

const MOCK_USER = {
  id: 'user_01',
  name: 'Alex Morgan',
  email: 'alex@animaforge.io',
  bio: 'Animation director & world-builder. Crafting stories one frame at a time.',
  avatarUrl: '/avatars/alex-morgan.jpg',
  theme: 'dark' as const,
  preferences: {
    language: 'en',
    timezone: 'America/Los_Angeles',
    autoSave: true,
    defaultProjectType: 'animation',
    showOnboarding: false,
  },
  createdAt: '2025-08-12T10:00:00Z',
  updatedAt: '2026-03-20T14:30:00Z',
};

export async function GET() {
  return NextResponse.json({ user: MOCK_USER });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const allowedFields = ['name', 'email', 'bio', 'avatarUrl', 'theme', 'preferences'];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields provided' },
      { status: 400 },
    );
  }

  const updatedUser = {
    ...MOCK_USER,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ user: updatedUser });
}

export async function DELETE() {
  return NextResponse.json({
    message: 'Account scheduled for deletion',
    deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}
