import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const now = new Date().toISOString();

  const duplicatedProject = {
    id: `proj_${Date.now()}`,
    title: 'Copy of Project',
    description: '',
    status: 'draft',
    projectType: 'animation',
    isPinned: false,
    totalShots: 0,
    approvedShots: 0,
    teamMembers: [],
    creditsCost: 0,
    sourceProjectId: params.id,
    updatedAt: now,
    createdAt: now,
  };

  return NextResponse.json({ project: duplicatedProject }, { status: 201 });
}
