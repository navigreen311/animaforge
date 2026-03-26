import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Helper: deterministic pseudo-random                               */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function randomInt(min: number, max: number, seed: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function lastNDays(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/* ------------------------------------------------------------------ */
/*  Mock project catalogue                                            */
/* ------------------------------------------------------------------ */
interface ProjectData {
  title: string;
  totalShots: number;
  approvedFirstTry: number;
  avgRenderTime: number;
  credits: { preview: number; standard: number; final: number };
  characters: { name: string; shots: number; driftScore: number }[];
}

const PROJECTS: Record<string, ProjectData> = {
  proj_001: {
    title: 'Cyber Samurai: Origin',
    totalShots: 24,
    approvedFirstTry: 18,
    avgRenderTime: 142,
    credits: { preview: 120, standard: 850, final: 430 },
    characters: [
      { name: 'Kaito', shots: 14, driftScore: 0.03 },
      { name: 'Yuki', shots: 8, driftScore: 0.07 },
      { name: 'Sensei Ren', shots: 6, driftScore: 0.05 },
    ],
  },
  proj_002: {
    title: 'Neon Drift',
    totalShots: 18,
    approvedFirstTry: 13,
    avgRenderTime: 158,
    credits: { preview: 95, standard: 720, final: 380 },
    characters: [
      { name: 'Axel', shots: 10, driftScore: 0.04 },
      { name: 'Nova', shots: 7, driftScore: 0.06 },
      { name: 'Chrome', shots: 5, driftScore: 0.08 },
    ],
  },
  proj_003: {
    title: 'Arcane Bloom',
    totalShots: 22,
    approvedFirstTry: 16,
    avgRenderTime: 136,
    credits: { preview: 110, standard: 790, final: 410 },
    characters: [
      { name: 'Elara', shots: 12, driftScore: 0.02 },
      { name: 'Thorn', shots: 9, driftScore: 0.05 },
      { name: 'Wisteria', shots: 7, driftScore: 0.04 },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/project/[id]                                   */
/* ------------------------------------------------------------------ */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const project = PROJECTS[id];

  if (!project) {
    return NextResponse.json(
      { error: `Project "${id}" not found` },
      { status: 404 },
    );
  }

  /* Generation timeline — 14 days of renders + approvals */
  const days14 = lastNDays(14);
  const generationTimeline = days14.map((date, i) => ({
    date,
    renders: randomInt(1, 5, i * 11 + 1),
    approvals: randomInt(0, 3, i * 11 + 2),
  }));

  return NextResponse.json({
    title: project.title,
    totalShots: project.totalShots,
    approvedFirstTry: project.approvedFirstTry,
    avgRenderTime: project.avgRenderTime,
    credits: project.credits,
    generationTimeline,
    characters: project.characters,
  });
}
