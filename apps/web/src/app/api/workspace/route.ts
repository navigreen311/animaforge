import { NextRequest, NextResponse } from 'next/server';

const MOCK_WORKSPACE = {
  id: 'ws_01',
  name: 'AnimaForge Studio',
  slug: 'animaforge-studio',
  timezone: 'America/Los_Angeles',
  defaults: {
    resolution: '1920x1080',
    fps: 24,
    style: 'cinematic',
    exportFormat: 'mp4',
  },
  createdAt: '2025-08-12T10:00:00Z',
  updatedAt: '2026-03-18T09:15:00Z',
};

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { name, slug, timezone, defaults } = body as {
    name?: string;
    slug?: string;
    timezone?: string;
    defaults?: Record<string, unknown>;
  };

  const updatedWorkspace = {
    ...MOCK_WORKSPACE,
    ...(name !== undefined && { name }),
    ...(slug !== undefined && { slug }),
    ...(timezone !== undefined && { timezone }),
    ...(defaults !== undefined && {
      defaults: { ...MOCK_WORKSPACE.defaults, ...defaults },
    }),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ workspace: updatedWorkspace });
}
