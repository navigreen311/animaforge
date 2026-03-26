import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await request.json()) as {
    isPinned?: boolean;
    title?: string;
    description?: string;
    status?: string;
  };

  const baseProject = {
    id: params.id,
    title: 'Untitled Project',
    description: '',
    status: 'draft',
    projectType: 'animation',
    isPinned: false,
    totalShots: 12,
    approvedShots: 5,
    teamMembers: [],
    creditsCost: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  };

  const updatedProject = { ...baseProject, ...body, id: params.id };

  return NextResponse.json({ project: updatedProject });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ success: true, projectId: params.id });
}
