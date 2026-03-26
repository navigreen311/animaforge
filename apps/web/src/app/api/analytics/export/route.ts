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

/* ------------------------------------------------------------------ */
/*  CSV generation helpers                                            */
/* ------------------------------------------------------------------ */
const PROJECTS = ['Cyber Samurai: Origin', 'Neon Drift', 'Arcane Bloom'];
const SHOTS = ['INT_DOJO_1', 'EXT_CITY_5', 'INT_LAB_3', 'EXT_FOREST_8', 'INT_BRIDGE_2'];
const TIERS = ['preview', 'standard', 'final'];
const MODELS = ['animaforge-v2', 'animaforge-v2-turbo', 'animaforge-v1'];
const STATUSES = ['completed', 'completed', 'completed', 'completed', 'failed'];
const FAILURE_REASONS = ['content_moderation', 'insufficient_credits', 'timeout'];

function generateCsv(rowCount: number): string {
  const headers = [
    'id',
    'date',
    'project',
    'shot',
    'duration_s',
    'credits',
    'tier',
    'model',
    'status',
    'failure_reason',
  ];

  const now = Date.now();
  const rows: string[] = [headers.join(',')];

  for (let i = 0; i < rowCount; i++) {
    const seed = i * 17 + 3;
    const status = STATUSES[randomInt(0, STATUSES.length - 1, seed + 1)];
    const date = new Date(now - randomInt(0, 29, seed + 2) * 86_400_000);
    const failureReason =
      status === 'failed'
        ? FAILURE_REASONS[randomInt(0, FAILURE_REASONS.length - 1, seed + 10)]
        : '';

    rows.push(
      [
        `render_${String(i + 1).padStart(4, '0')}`,
        date.toISOString(),
        `"${PROJECTS[randomInt(0, 2, seed + 3)]}"`,
        SHOTS[randomInt(0, 4, seed + 4)],
        randomInt(8, 45, seed + 6),
        randomInt(15, 120, seed + 7),
        TIERS[randomInt(0, 2, seed + 8)],
        MODELS[randomInt(0, 2, seed + 9)],
        status,
        failureReason,
      ].join(','),
    );
  }

  return rows.join('\n');
}

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/export?format=csv|pdf&type=render-history      */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'csv';
  const type = searchParams.get('type') ?? 'render-history';

  /* --- CSV export -------------------------------------------------- */
  if (format === 'csv') {
    const csv = generateCsv(50);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="animaforge-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  /* --- PDF export (mock) ------------------------------------------- */
  if (format === 'pdf') {
    return NextResponse.json({
      downloadUrl: '/mock-analytics-report.pdf',
      type,
      generatedAt: new Date().toISOString(),
    });
  }

  /* --- Unsupported format ------------------------------------------ */
  return NextResponse.json(
    { error: `Unsupported format "${format}". Use "csv" or "pdf".` },
    { status: 400 },
  );
}
