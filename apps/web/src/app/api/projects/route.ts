import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PROJECTS, MOCK_STATS } from '@/lib/mockData';
import type { Project, ProjectStatus, ProjectType } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const sort = searchParams.get('sort') ?? 'recent';
  const search = searchParams.get('search');

  let filteredProjects = [...MOCK_PROJECTS];

  // Filter by status
  if (status && status !== 'all') {
    filteredProjects = filteredProjects.filter(
      (project) => project.status === status,
    );
  }

  // Filter by search term (case-insensitive match on title or description)
  if (search) {
    const query = search.toLowerCase();
    filteredProjects = filteredProjects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query),
    );
  }

  // Sort
  switch (sort) {
    case 'name':
      filteredProjects.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'progress':
      filteredProjects.sort((a, b) => {
        const progressA = a.totalShots > 0 ? a.approvedShots / a.totalShots : 0;
        const progressB = b.totalShots > 0 ? b.approvedShots / b.totalShots : 0;
        return progressB - progressA;
      });
      break;
    case 'shots':
      filteredProjects.sort((a, b) => b.totalShots - a.totalShots);
      break;
    case 'recent':
    default:
      filteredProjects.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      break;
  }

  return NextResponse.json({
    projects: filteredProjects,
    stats: MOCK_STATS,
    total: filteredProjects.length,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, projectType } = body as {
    title?: string;
    description?: string;
    projectType?: string;
  };

  if (!title || title.trim().length === 0) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const newProject: Project = {
    id: `proj_${Date.now()}`,
    title: title.trim(),
    description: description?.trim() ?? '',
    status: 'draft',
    projectType: (projectType as ProjectType) ?? 'animation',
    totalShots: 0,
    approvedShots: 0,
    teamMembers: [],
    creditsCost: 0,
    updatedAt: now,
    createdAt: now,
  };

  return NextResponse.json({ project: newProject }, { status: 201 });
}
