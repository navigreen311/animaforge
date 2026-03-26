import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Helper: deterministic pseudo-random seeded by day index           */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function randomInt(min: number, max: number, seed: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

/* ------------------------------------------------------------------ */
/*  Generate date strings for the last N days                         */
/* ------------------------------------------------------------------ */
function lastNDays(n: number, anchor: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/* ------------------------------------------------------------------ */
/*  Render history helpers                                            */
/* ------------------------------------------------------------------ */
const PROJECT_NAMES = ['Cyber Samurai: Origin', 'Neon Drift', 'Arcane Bloom'];
const SHOT_PREFIXES = ['INT_DOJO', 'EXT_CITY', 'INT_LAB', 'EXT_FOREST', 'INT_BRIDGE'];
const TIERS = ['preview', 'standard', 'final'] as const;
const MODELS = ['animaforge-v2', 'animaforge-v2-turbo', 'animaforge-v1'] as const;
const STATUSES = ['completed', 'completed', 'completed', 'completed', 'failed'] as const; // ~20% fail for pool
const FAILURE_REASONS = ['content_moderation', 'insufficient_credits', 'timeout', 'model_overload'];

function generateRenderHistory(count: number) {
  const rows = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 3;
    const status = STATUSES[randomInt(0, STATUSES.length - 1, seed + 1)];
    const date = new Date(now - randomInt(0, 29, seed + 2) * 86_400_000);

    rows.push({
      id: `render_${String(i + 1).padStart(4, '0')}`,
      date: date.toISOString(),
      project: PROJECT_NAMES[randomInt(0, 2, seed + 3)],
      shot: `${SHOT_PREFIXES[randomInt(0, 4, seed + 4)]}_${randomInt(1, 30, seed + 5)}`,
      duration: randomInt(8, 45, seed + 6),
      credits: randomInt(15, 120, seed + 7),
      tier: TIERS[randomInt(0, 2, seed + 8)],
      model: MODELS[randomInt(0, 2, seed + 9)],
      status,
      ...(status === 'failed'
        ? { failureReason: FAILURE_REASONS[randomInt(0, 3, seed + 10)] }
        : {}),
    });
  }

  return rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/* ------------------------------------------------------------------ */
/*  GET /api/analytics                                                */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const _from = searchParams.get('from');
  const _to = searchParams.get('to');

  /* --- KPIs -------------------------------------------------------- */
  const kpis = {
    totalRenders: 847,
    creditsSpent: 4200,
    avgRenderTime: 154,
    successRate: 96.2,
    creditsTotal: 10000,
  };

  /* --- Sparklines (last 7 data points) ----------------------------- */
  const sparklines = {
    renders: [95, 102, 88, 110, 125, 98, 115],
    credits: [580, 620, 550, 610, 640, 590, 620],
    renderTime: [180, 165, 158, 142, 150, 148, 154],
    successRate: [94, 95, 96, 97, 96, 95, 96],
  };

  /* --- Render volume (30 days) ------------------------------------- */
  const days30 = lastNDays(30);
  const renderVolume = days30.map((date, i) => ({
    date,
    completed: randomInt(20, 40, i * 7 + 1),
    failed: randomInt(0, 3, i * 7 + 2),
  }));

  /* --- Credit burn (30 days, counting down from 10 000) ------------ */
  let remaining = 10000;
  const creditBurn = days30.map((date, i) => {
    if (i > 0) {
      remaining -= randomInt(100, 180, i * 13);
      if (remaining < 0) remaining = 0;
    }
    return { date, remaining };
  });

  /* --- Credit usage by category ------------------------------------ */
  const creditUsage = [
    { category: 'Video Generation', credits: 2100 },
    { category: 'Audio', credits: 680 },
    { category: 'Style Transfer', credits: 520 },
    { category: 'Avatar', credits: 440 },
    { category: 'Script AI', credits: 460 },
  ];

  /* --- Top projects ------------------------------------------------ */
  const topProjects = [
    { id: 'proj_001', title: 'Cyber Samurai: Origin', credits: 1850, renderCount: 312, shotCount: 48 },
    { id: 'proj_002', title: 'Neon Drift', credits: 1340, renderCount: 245, shotCount: 32 },
    { id: 'proj_003', title: 'Arcane Bloom', credits: 1010, renderCount: 290, shotCount: 40 },
  ];

  /* --- Render history (50 rows) ------------------------------------ */
  const renderHistory = generateRenderHistory(50);

  /* --- Failure analysis -------------------------------------------- */
  const failureAnalysis = {
    total: 2,
    reasons: {
      content_moderation: 1,
      insufficient_credits: 1,
    },
    retrySuccess: 1,
  };

  /* --- Burn forecast ----------------------------------------------- */
  const burnForecast = {
    dailyRate: 140,
    remaining: 5800,
    daysLeft: 41,
    depletionDate: '2026-05-06',
  };

  return NextResponse.json({
    kpis,
    sparklines,
    renderVolume,
    creditBurn,
    creditUsage,
    topProjects,
    renderHistory,
    failureAnalysis,
    burnForecast,
  });
}
