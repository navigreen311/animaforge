'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  ChevronDown,
  Download,
  X,
  MonitorPlay,
  Play,
  Share2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type DateRange = '7d' | '30d' | '90d' | '1y' | 'custom';
type RenderStatus = 'Complete' | 'Failed' | 'Running';
type RenderTier = 'Standard' | 'Pro' | 'Ultra';
type CreditCategory = 'Video' | 'Audio' | 'Style' | 'Avatar' | 'Script';
type FailureReason =
  | 'content_moderation'
  | 'insufficient_credits'
  | 'timeout'
  | 'gpu_oom'
  | 'model_error';
type Platform = 'youtube' | 'tiktok' | 'meta';

interface DaySnapshot {
  date: string;
  label: string;
  completed: number;
  failed: number;
  creditsUsed: number;
  creditsRemaining: number;
  avgRenderSec: number;
  successRate: number;
}

interface RenderHistoryRow {
  id: string;
  date: string;
  project: string;
  projectId?: string;
  shot: string;
  shotId?: string;
  duration: string;
  credits: number;
  tier: RenderTier;
  status: RenderStatus;
  failureReason?: FailureReason;
}

interface CreditCategoryData {
  category: CreditCategory;
  credits: number;
  pct: number;
  trend: number; // positive = up
}

interface TopProjectData {
  id: string;
  name: string;
  credits: number;
  renders: number;
  tierBreakdown: { standard: number; pro: number; ultra: number };
  timeline: { day: string; count: number }[];
  topCharacter: string;
  firstPassApprovalRate: number; // 0..1
  avgRenderSec: number;
  shotsOverTime: { day: string; shots: number }[];
}

interface PlatformData {
  platform: Platform;
  connected: boolean;
  bestVideo?: { title: string; views: number; retention: number[] };
}

interface FailureAnalysis {
  reason: FailureReason;
  count: number;
  retrySuccessRate: number;
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS
// ══════════════════════════════════════════════════════════════

function generateDateLabels(days: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.toLocaleString('en', { month: 'short' });
    const day = d.getDate();
    out.push({
      date: d.toISOString().slice(0, 10),
      label: `${month} ${day}`,
    });
  }
  return out;
}

/** One generation job, as GET /api/jobs returns it. */
interface JobRow {
  id: string;
  projectId: string;
  projectName: string | null;
  shotNumber: number | null;
  jobType: string;
  tier: string;
  status: string;
  costCredits: number | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorReason: string | null;
}

/** GET /api/analytics. */
interface AnalyticsSummary {
  period: string;
  projects: number;
  generations: number;
  completed: number;
  failed: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTier: Record<string, number>;
  creditsByType: Record<string, number>;
  failureReasons: Record<string, number>;
  topProjects: {
    id: string;
    title: string;
    credits: number;
    renders: number;
    tiers: Record<string, number>;
  }[];
  creditsUsed: number;
}

/**
 * Roll real jobs up into one row per day.
 *
 * This replaces `generateSnapshots`, which produced a seeded random walk: 20-40
 * completions a day, a 95-99.5% success rate and a credit balance draining from
 * 10,000. Every chart on this page was drawn from that.
 *
 * Two fields the old snapshot carried are gone rather than recomputed:
 * `creditsRemaining` (usage_meters records credits spent per period, never a
 * balance) is left at zero, and it is not charted. `avgRenderSec` is a real
 * average of completed jobs' elapsed time, and is zero on a day where nothing
 * completed -- not a filler value.
 */
function snapshotsFromJobs(jobs: JobRow[], days: number): DaySnapshot[] {
  const buckets = new Map<string, JobRow[]>();
  for (const j of jobs) {
    const key = j.createdAt.slice(0, 10);
    const list = buckets.get(key);
    if (list) list.push(j);
    else buckets.set(key, [j]);
  }

  return generateDateLabels(days).map((d) => {
    const rows = buckets.get(d.date) ?? [];
    const completed = rows.filter((r) => r.status === 'complete').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const finished = completed + failed;
    const timed = rows.filter((r) => r.status === 'complete' && r.durationMs !== null);
    return {
      date: d.date,
      label: d.label,
      completed,
      failed,
      creditsUsed: rows.reduce((sum, r) => sum + (r.costCredits ?? 0), 0),
      creditsRemaining: 0,
      avgRenderSec: timed.length
        ? Math.round(timed.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / timed.length / 1000)
        : 0,
      successRate: finished ? parseFloat(((completed / finished) * 100).toFixed(1)) : 0,
    };
  });
}

function getSnapshots(
  jobs: JobRow[],
  range: DateRange,
  customFrom?: string,
  customTo?: string,
): DaySnapshot[] {
  switch (range) {
    case '7d':
      return snapshotsFromJobs(jobs, 7);
    case '30d':
      return snapshotsFromJobs(jobs, 30);
    case '90d':
      return snapshotsFromJobs(jobs, 90);
    case '1y':
      return snapshotsFromJobs(jobs, 365);
    case 'custom': {
      const all = snapshotsFromJobs(jobs, 365);
      if (!customFrom || !customTo) return all;
      return all.filter((s) => s.date >= customFrom && s.date <= customTo);
    }
    default:
      return snapshotsFromJobs(jobs, 30);
  }
}

// Compute from/to ISO dates (YYYY-MM-DD) for a given range
function computeRangeDates(
  range: DateRange,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now);
  switch (range) {
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case '30d':
      from.setDate(from.getDate() - 29);
      break;
    case '90d':
      from.setDate(from.getDate() - 89);
      break;
    case '1y':
      from.setDate(from.getDate() - 364);
      break;
    case 'custom':
      return { from: customFrom || to, to: customTo || to };
  }
  return { from: from.toISOString().slice(0, 10), to };
}

const TIERS: RenderTier[] = ['Standard', 'Pro', 'Ultra'];

/**
 * Map real jobs onto the render-history table.
 *
 * `generateRenderHistory` used to fabricate 120 rows: a random project from a
 * list of five names, a random shot from a list of ten, a random tier, a 6%
 * failure rate and a random failure reason. These are the caller's actual jobs.
 */
function toHistory(jobs: JobRow[]): RenderHistoryRow[] {
  return jobs.map((j) => {
    const status: RenderStatus =
      j.status === 'complete'
        ? 'Complete'
        : j.status === 'failed'
          ? 'Failed'
          : j.status === 'processing' || j.status === 'queued'
            ? 'Running'
            : 'Complete';
    const secs = j.durationMs === null ? null : Math.round(j.durationMs / 1000);
    return {
      id: j.id,
      date: j.createdAt.slice(0, 10),
      project: j.projectName ?? j.projectId,
      projectId: j.projectId,
      shot: j.shotNumber === null ? j.jobType : `Shot ${j.shotNumber}`,
      shotId: j.id,
      duration:
        secs === null
          ? '—'
          : `${Math.floor(secs / 60)}m ${(secs % 60).toString().padStart(2, '0')}s`,
      credits: j.costCredits ?? 0,
      tier: (TIERS.find((t) => t.toLowerCase() === j.tier.toLowerCase()) ??
        'Standard') as RenderTier,
      status,
      // Only a reason the job actually recorded; no reason is left blank.
      failureReason: (j.errorReason as FailureReason | null) ?? undefined,
    };
  });
}

// ══════════════════════════════════════════════════════════════
// SHARED STYLES
// ══════════════════════════════════════════════════════════════

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 16,
};

const secTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 12px',
};

const lbl: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  letterSpacing: '0.05em',
  fontWeight: 500,
  margin: 0,
};

const valBig: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '4px 0 2px',
};

const btnBase: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--border)',
  color: 'var(--text-secondary)',
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const dropdownMenu: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 4,
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '4px 0',
  minWidth: 180,
  zIndex: 50,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

const dropdownItem: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
};

const pillBadge = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 500,
  padding: '2px 8px',
  borderRadius: 'var(--radius-lg)',
  background: bg,
  color,
  whiteSpace: 'nowrap',
});

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last 1 year',
  custom: 'Custom range',
};

const VALID_DATE_RANGES: DateRange[] = ['7d', '30d', '90d', '1y', 'custom'];
function parseDateRange(v: string | null): DateRange {
  return v && (VALID_DATE_RANGES as string[]).includes(v) ? (v as DateRange) : '30d';
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function statusColor(s: RenderStatus) {
  const map: Record<RenderStatus, { bg: string; color: string }> = {
    Complete: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
    Failed: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
    Running: { bg: 'rgba(234,179,8,0.12)', color: '#facc15' },
  };
  return map[s];
}

function tierColor(t: RenderTier) {
  const map: Record<RenderTier, { bg: string; color: string }> = {
    Standard: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
    Pro: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
    Ultra: { bg: 'rgba(234,179,8,0.12)', color: '#facc15' },
  };
  return map[t];
}

const FAILURE_LABELS: Record<FailureReason, string> = {
  content_moderation: 'Content Moderation',
  insufficient_credits: 'Insufficient Credits',
  timeout: 'Timeout',
  gpu_oom: 'GPU Out of Memory',
  model_error: 'Model Error',
};

const BRAND_PURPLE = '#a78bfa';
const BRAND_PURPLE_DIM = 'rgba(167,139,250,0.3)';
const RED = '#f87171';
const GREEN = '#4ade80';
const AMBER = '#facc15';

// ══════════════════════════════════════════════════════════════
// MINI SPARKLINE (SVG, no Recharts for 80x28 sparklines)
// ══════════════════════════════════════════════════════════════

function Sparkline({
  data,
  type = 'line',
  color = BRAND_PURPLE,
}: {
  data: number[];
  type?: 'line' | 'area' | 'bar';
  color?: string;
}) {
  const w = 80;
  const h = 28;
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  if (type === 'bar') {
    const barW = w / data.length - 1;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {data.map((v, i) => {
          const barH = ((v - min) / range) * (h - 2);
          return (
            <rect
              key={i}
              x={i * (barW + 1)}
              y={h - barH}
              width={barW}
              height={barH}
              rx={1}
              fill={color}
              opacity={0.8}
            />
          );
        })}
      </svg>
    );
  }

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  if (type === 'area') {
    const areaD = `${d} L${w},${h} L0,${h} Z`;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id={`spk-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#spk-grad-${color.replace('#', '')})`} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    );
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// CUSTOM RECHARTS TOOLTIP
// ══════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        fontSize: 11,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ color: 'var(--text-tertiary)', margin: '0 0 4px', fontWeight: 500 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || 'var(--text-secondary)', margin: 0 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? fmtNum(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DROPDOWN HOOK
// ══════════════════════════════════════════════════════════════

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return { open, setOpen, ref };
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

const CREDIT_CATEGORY_FOR: Record<string, CreditCategory> = {
  video: 'Video',
  audio: 'Audio',
  voice: 'Audio',
  music: 'Audio',
  style: 'Style',
  avatar: 'Avatar',
  script: 'Script',
};

/**
 * Credits per category, summed from the caller's own jobs.
 *
 * `trend` is zero for every category. Comparing against a previous period needs
 * a second aggregate the endpoint does not return, and the old +12 / -5 / +8
 * arrows were literals, so no arrow is drawn rather than a wrong one.
 */
function creditCategories(creditsByType: Record<string, number>): CreditCategoryData[] {
  const totals: Record<CreditCategory, number> = {
    Video: 0,
    Audio: 0,
    Style: 0,
    Avatar: 0,
    Script: 0,
  };
  for (const [type, credits] of Object.entries(creditsByType)) {
    const key = type.toLowerCase();
    const category =
      Object.entries(CREDIT_CATEGORY_FOR).find(([needle]) => key.includes(needle))?.[1] ?? 'Video';
    totals[category] += credits;
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  return (Object.keys(totals) as CreditCategory[])
    .map((category) => ({
      category,
      credits: Math.round(totals[category]),
      pct: sum ? parseFloat(((totals[category] / sum) * 100).toFixed(1)) : 0,
      trend: 0,
    }))
    .sort((a, b) => b.credits - a.credits);
}

/**
 * Top projects by credit spend.
 *
 * Four fields the drawer used to show are gone, because nothing records them:
 * the top character per project (character_refs is an id array on a shot with
 * no usage counter), the first-pass approval rate (shots carry approved_by but
 * never a count of attempts), and both per-day series. `avgRenderSec` is real
 * where jobs recorded start and end times.
 */
function topProjectsFrom(summary: AnalyticsSummary, jobs: JobRow[]): TopProjectData[] {
  return summary.topProjects.map((p) => {
    const timed = jobs.filter(
      (j) => j.projectId === p.id && j.status === 'complete' && j.durationMs !== null,
    );
    return {
      id: p.id,
      name: p.title,
      credits: Math.round(p.credits),
      renders: p.renders,
      tierBreakdown: {
        standard: p.tiers.standard ?? p.tiers.preview ?? 0,
        pro: p.tiers.pro ?? 0,
        ultra: p.tiers.ultra ?? 0,
      },
      timeline: [],
      topCharacter: '',
      firstPassApprovalRate: 0,
      avgRenderSec: timed.length
        ? Math.round(timed.reduce((sum, j) => sum + (j.durationMs ?? 0), 0) / timed.length / 1000)
        : 0,
      shotsOverTime: [],
    };
  });
}

/**
 * Failure counts, by the reason the job actually recorded.
 *
 * `retrySuccessRate` is zero throughout: a retry creates a new job row with no
 * link back to the one it replaced, so there is no way to tell whether a retry
 * succeeded. The old 25%-92% spread was invented.
 */
function failureAnalysisFrom(failureReasons: Record<string, number>): FailureAnalysis[] {
  return Object.entries(failureReasons)
    .map(([reason, count]) => ({
      reason: reason as FailureReason,
      count,
      retrySuccessRate: 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Publishing platforms.
 *
 * `connected` is false for all three because no table records an OAuth
 * connection to YouTube, TikTok or Meta -- the console has no credential store
 * for them. `bestVideo` (a title, a view count and an eight-point retention
 * curve) is gone: nothing ingests platform analytics.
 */
const PLATFORM_DATA: PlatformData[] = [
  { platform: 'youtube', connected: false },
  { platform: 'tiktok', connected: false },
  { platform: 'meta', connected: false },
];

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Everything on this page is derived from these two requests. The page used
  // to compute all of it from seeded randomness -- see snapshotsFromJobs.
  const jobState = useResource<{ items: JobRow[] }>('/api/jobs?limit=100');
  const summaryState = useResource<AnalyticsSummary>('/api/analytics?period=month');
  const jobs = useMemo(() => jobState.data?.items ?? [], [jobState.data]);
  const summary = summaryState.data;

  const CREDIT_CATEGORIES = useMemo(
    () => (summary ? creditCategories(summary.creditsByType) : []),
    [summary],
  );
  const CREDIT_TOTAL = CREDIT_CATEGORIES.reduce((sum, c) => sum + c.credits, 0);
  // The project filter used to list five fixed names; these are the projects
  // the caller's jobs actually belong to.
  const projectNames = useMemo(
    () => [...new Set(jobs.map((j) => j.projectName ?? j.projectId))].sort(),
    [jobs],
  );
  const TOP_PROJECTS_DATA = useMemo(
    () => (summary ? topProjectsFrom(summary, jobs) : []),
    [summary, jobs],
  );
  const FAILURE_ANALYSIS = useMemo(
    () => (summary ? failureAnalysisFrom(summary.failureReasons) : []),
    [summary],
  );
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  // ── State ───────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    parseDateRange(searchParams?.get('range') ?? null),
  );
  const [customFrom, setCustomFrom] = useState<string>(
    () => searchParams?.get('from') ?? '2026-02-25',
  );
  const [customTo, setCustomTo] = useState<string>(() => searchParams?.get('to') ?? '2026-03-25');
  const dateDropdown = useDropdown();
  const exportDropdown = useDropdown();

  // Sync dateRange → URL (?range=...&from=...&to=...)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    params.set('range', dateRange);
    if (dateRange === 'custom') {
      params.set('from', customFrom);
      params.set('to', customTo);
    } else {
      params.delete('from');
      params.delete('to');
    }
    const qs = params.toString();
    router.replace(`/analytics${qs ? `?${qs}` : ''}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customFrom, customTo]);

  const [categoryFilter, setCategoryFilter] = useState<CreditCategory | null>(null);
  const [categoryTooltip, setCategoryTooltip] = useState<{
    cat: CreditCategoryData;
    x: number;
    y: number;
  } | null>(null);
  const [runningProgress, setRunningProgress] = useState<Record<string, number>>({});
  const [tablePage, setTablePage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drawerProject, setDrawerProject] = useState<TopProjectData | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<Platform>>(new Set());

  // ── Derived Data ────────────────────────────────────────────
  const snapshots = useMemo(
    () => getSnapshots(jobs, dateRange, customFrom, customTo),
    [jobs, dateRange, customFrom, customTo],
  );
  const rangeDates = useMemo(
    () => computeRangeDates(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo],
  );
  // The table shows the jobs that fall inside the selected range. It used to
  // slice a fixed number of fabricated rows per range, which meant the row
  // count changed with the picker while the underlying rows never did.
  const renderHistory = useMemo(() => toHistory(jobs), [jobs]);
  const rangeFilteredHistory = useMemo(() => {
    const from = rangeDates.from;
    const to = rangeDates.to;
    if (!from || !to) return renderHistory;
    return renderHistory.filter((r) => r.date >= from && r.date <= to);
  }, [renderHistory, rangeDates]);

  const kpis = useMemo(() => {
    const totalRenders = snapshots.reduce((s, d) => s + d.completed + d.failed, 0);
    const creditsSpent = snapshots.reduce((s, d) => s + d.creditsUsed, 0);
    const avgRenderSec = Math.round(
      snapshots.reduce((s, d) => s + d.avgRenderSec, 0) / snapshots.length,
    );
    const successRate = parseFloat(
      (snapshots.reduce((s, d) => s + d.successRate, 0) / snapshots.length).toFixed(1),
    );
    return { totalRenders, creditsSpent, avgRenderSec, successRate };
  }, [snapshots]);

  const sparkData = useMemo(() => {
    const last7 = snapshots.slice(-7);
    return {
      renders: last7.map((d) => d.completed + d.failed),
      credits: last7.map((d) => d.creditsUsed),
      avgTime: last7.map((d) => d.avgRenderSec),
      success: last7.map((d) => d.successRate),
    };
  }, [snapshots]);

  // Credit forecast.
  //
  // usage_meters records credits *spent* per period; nothing records a balance
  // or an allowance, so a remaining figure cannot be computed. The hardcoded
  // 5,800-remaining / 140-a-day pair is gone. The burn rate below is real (an
  // average over the days in range); the runway it would imply is not shown,
  // because there is no starting balance to run down.
  const dailyBurn = useMemo(() => {
    if (snapshots.length === 0) return 0;
    return snapshots.reduce((sum, d) => sum + d.creditsUsed, 0) / snapshots.length;
  }, [snapshots]);
  const CREDITS_REMAINING = 0;
  const DAILY_RATE = Math.round(dailyBurn);
  const daysLeft = 0;
  const depletionDate = new Date();
  const depletionLabel = depletionDate.toLocaleDateString('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const forecastColor = AMBER;
  const forecastPulse = false;

  // Render volume chart data (use last 30 from snapshots for line chart)
  const renderVolumeData = useMemo(() => {
    const slice = snapshots.slice(-30);
    return slice.map((d) => ({
      name: d.label,
      completed: d.completed,
      failed: d.failed,
    }));
  }, [snapshots]);

  // Credit burn chart data.
  //
  // Cumulative spend, not a draining balance: the old chart started every
  // account at 10,000 credits and subtracted from it, then projected 15 days
  // forward from that invented number. Spend is recorded; the balance is not.
  const creditBurnData = useMemo(() => {
    let running = 0;
    return snapshots.slice(-30).map((d) => {
      running += d.creditsUsed;
      return { name: d.label, remaining: running, projected: null as number | null };
    });
  }, [snapshots]);

  // No allowance is recorded, so there is no threshold to colour against.
  const redZoneThreshold = Number.POSITIVE_INFINITY;

  // A row's credit category is its job type. This used to hash the row id into
  // one of five categories, so the same render could be "Audio" in one build
  // and "Style" in the next.
  const jobTypeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of jobs) map.set(j.id, j.jobType);
    return map;
  }, [jobs]);
  const rowCategory = useCallback(
    (rowId: string): CreditCategory => {
      const type = (jobTypeById.get(rowId) ?? '').toLowerCase();
      if (type.includes('audio') || type.includes('voice') || type.includes('music'))
        return 'Audio';
      if (type.includes('style')) return 'Style';
      if (type.includes('avatar')) return 'Avatar';
      if (type.includes('script')) return 'Script';
      return 'Video';
    },
    [jobTypeById],
  );

  // Table filtering
  const filteredHistory = useMemo(() => {
    let rows = rangeFilteredHistory;
    if (categoryFilter) {
      rows = rows.filter((r) => rowCategory(r.id) === categoryFilter);
    }
    if (filterProject) rows = rows.filter((r) => r.project === filterProject);
    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    if (filterTier) rows = rows.filter((r) => r.tier === filterTier);
    return rows;
  }, [rangeFilteredHistory, categoryFilter, filterProject, filterStatus, filterTier, rowCategory]);

  // Running rows -> animated progress simulation
  const runningRowIds = useMemo(
    () => renderHistory.filter((r) => r.status === 'Running').map((r) => r.id),
    [renderHistory],
  );

  useEffect(() => {
    if (runningRowIds.length === 0) return;
    setRunningProgress((prev) => {
      const next = { ...prev };
      runningRowIds.forEach((id) => {
        if (next[id] === undefined) {
          let h = 0;
          for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
          next[id] = h % 40;
        }
      });
      return next;
    });
    const interval = setInterval(() => {
      setRunningProgress((prev) => {
        const next = { ...prev };
        runningRowIds.forEach((id) => {
          const cur = next[id] ?? 0;
          const inc = 5 + ((cur * 7) % 6);
          next[id] = cur + inc >= 100 ? 0 : cur + inc;
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [runningRowIds]);

  const totalPages = Math.ceil(filteredHistory.length / perPage);
  const pageRows = filteredHistory.slice(tablePage * perPage, (tablePage + 1) * perPage);
  const failedRows = renderHistory.filter((r) => r.status === 'Failed');
  const hasFailures = failedRows.length > 0;

  // Export handlers
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const handleExportCSV = useCallback(() => {
    exportDropdown.setOpen(false);
    const header = ['Date', 'Project', 'Shot', 'Duration', 'Credits', 'Tier', 'Status'];
    const lines = [header.join(',')];
    filteredHistory.forEach((r) => {
      const row = [r.date, r.project, r.shot, r.duration, r.credits, r.tier, r.status]
        .map((v) => {
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(',');
      lines.push(row);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `analytics-${dateRange}-${rangeDates.from}_${rangeDates.to}.csv`);
    toast.success('CSV exported');
  }, [exportDropdown, filteredHistory, dateRange, rangeDates, downloadBlob]);

  const handleExportPDF = useCallback(() => {
    exportDropdown.setOpen(false);
    const toastId = toast.loading('Generating PDF report...');
    setTimeout(() => {
      const mockPdfContent = `%PDF-1.4\n% AnimaForge Analytics Report\n% Range: ${dateRange} (${rangeDates.from} to ${rangeDates.to})\n% Renders: ${kpis.totalRenders}\n% Credits Spent: ${kpis.creditsSpent}\n%%EOF\n`;
      const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
      downloadBlob(blob, `analytics-${dateRange}-report.pdf`);
      toast.success('PDF report downloaded', { id: toastId });
    }, 2000);
  }, [exportDropdown, dateRange, rangeDates, kpis, downloadBlob]);

  const handleRetryShot = useCallback((rowId: string) => {
    toast.info('Shot queued for retry');
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  // ── Render ──────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div
        style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      >
        {/* Every chart below is derived from these two requests. If either
            failed, the charts are empty rather than wrong -- say which. */}
        {(jobState.loading || summaryState.loading) && (
          <div style={{ padding: '16px 24px 0' }}>
            <LoadingState label="Loading analytics" />
          </div>
        )}
        {!jobState.loading && jobState.error && (
          <div style={{ padding: '16px 24px 0' }}>
            <ErrorState error={jobState.error} onRetry={jobState.reload} />
          </div>
        )}
        {!summaryState.loading && summaryState.error && (
          <div style={{ padding: '16px 24px 0' }}>
            <ErrorState error={summaryState.error} onRetry={summaryState.reload} />
          </div>
        )}

        {/* ═══ HEADER ═══════════════════════════════════════════ */}
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Analytics
          </h1>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Date Range Dropdown */}
            <div ref={dateDropdown.ref} style={{ position: 'relative' }}>
              <button
                type="button"
                style={btnBase}
                onClick={() => dateDropdown.setOpen(!dateDropdown.open)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {DATE_RANGE_LABELS[dateRange]}
                <ChevronDown size={12} />
              </button>
              {dateDropdown.open && (
                <div style={{ ...dropdownMenu, minWidth: 220 }}>
                  {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      style={{
                        ...dropdownItem,
                        background: key === dateRange ? 'var(--bg-hover)' : 'transparent',
                        fontWeight: key === dateRange ? 600 : 400,
                      }}
                      onClick={() => {
                        setDateRange(key);
                        if (key !== 'custom') dateDropdown.setOpen(false);
                        setTablePage(0);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          key === dateRange ? 'var(--bg-hover)' : 'transparent';
                      }}
                    >
                      {DATE_RANGE_LABELS[key]}
                    </button>
                  ))}
                  {dateRange === 'custom' && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderTop: '0.5px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        From
                        <input
                          type="date"
                          value={customFrom}
                          max={customTo}
                          onChange={(e) => {
                            setCustomFrom(e.target.value);
                            setTablePage(0);
                          }}
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '0.5px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            padding: '4px 8px',
                            fontSize: 12,
                          }}
                        />
                      </label>
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        To
                        <input
                          type="date"
                          value={customTo}
                          min={customFrom}
                          onChange={(e) => {
                            setCustomTo(e.target.value);
                            setTablePage(0);
                          }}
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '0.5px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            padding: '4px 8px',
                            fontSize: 12,
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        style={{
                          ...btnBase,
                          justifyContent: 'center',
                          background: 'var(--brand)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                        }}
                        onClick={() => dateDropdown.setOpen(false)}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div ref={exportDropdown.ref} style={{ position: 'relative' }}>
              <button
                type="button"
                style={btnBase}
                onClick={() => exportDropdown.setOpen(!exportDropdown.open)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Download size={12} />
                Export
                <ChevronDown size={12} />
              </button>
              {exportDropdown.open && (
                <div style={dropdownMenu}>
                  <button
                    type="button"
                    style={{ ...dropdownItem, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={handleExportCSV}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FileSpreadsheet size={13} />
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    style={{ ...dropdownItem, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={handleExportPDF}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FileText size={13} />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT ═══════════════════════════════ */}
        <main
          style={{
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* ═══ CREDIT FORECAST BAR ════════════════════════════ */}
          <div
            style={{
              ...card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              borderLeft: `3px solid ${forecastColor}`,
              animation: forecastPulse ? 'pulse-red 2s ease-in-out infinite' : undefined,
            }}
          >
            <style>{`
            @keyframes pulse-red {
              0%, 100% { border-left-color: ${RED}; }
              50% { border-left-color: rgba(248,113,113,0.3); }
            }
          `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Zap size={16} style={{ color: forecastColor, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                At your current rate (
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fmtNum(DAILY_RATE)} credits/day
                </strong>
                ), your{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fmtNum(CREDITS_REMAINING)} remaining credits
                </strong>{' '}
                will last <strong style={{ color: forecastColor }}>~{daysLeft} days</strong> (until{' '}
                {depletionLabel})
              </span>
            </div>
            <button
              type="button"
              style={{
                ...btnBase,
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                flexShrink: 0,
              }}
              onClick={() => toast.info('Redirecting to upgrade...')}
            >
              Upgrade plan
            </button>
          </div>

          {/* ═══ 4 KPI CARDS ════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {/* Total Renders */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <BarChart3 size={12} style={{ color: 'var(--text-tertiary)' }} />
                <p style={lbl}>Total Renders</p>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <p style={valBig}>{fmtNum(kpis.totalRenders)}</p>
                <Sparkline data={sparkData.renders} type="bar" color={BRAND_PURPLE} />
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: GREEN,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ArrowUpRight size={10} /> +12% from last period
              </p>
            </div>

            {/* Credits Spent */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Zap size={12} style={{ color: 'var(--text-tertiary)' }} />
                <p style={lbl}>Credits Spent</p>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <p style={valBig}>{fmtNum(kpis.creditsSpent)}</p>
                <Sparkline data={sparkData.credits} type="area" color={BRAND_PURPLE} />
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: RED,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ArrowUpRight size={10} /> +18% from last period
              </p>
            </div>

            {/* Avg Render Time */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
                <p style={lbl}>Avg Render Time</p>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <p style={valBig}>{fmtSec(kpis.avgRenderSec)}</p>
                <Sparkline data={sparkData.avgTime} type="line" color={GREEN} />
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: GREEN,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ArrowDownRight size={10} /> -8s from last period
              </p>
            </div>

            {/* Success Rate */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <TrendingUp size={12} style={{ color: 'var(--text-tertiary)' }} />
                <p style={lbl}>Success Rate</p>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <p style={valBig}>{kpis.successRate}%</p>
                <Sparkline data={sparkData.success} type="line" color={BRAND_PURPLE} />
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: GREEN,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ArrowUpRight size={10} /> +1.4% from last period
              </p>
            </div>
          </div>

          {/* ═══ TWO-COLUMN CHART ROW ═══════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: 12 }}>
            {/* ── LEFT: Render Volume Line Chart ────────────────── */}
            <div style={card}>
              <h2 style={secTitle}>Render Volume</h2>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={renderVolumeData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      interval={Math.max(Math.floor(renderVolumeData.length / 8), 0)}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke={BRAND_PURPLE}
                      strokeWidth={2}
                      dot={false}
                      name="Completed"
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke={RED}
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      name="Failed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── RIGHT: Credit Burn Area Chart ─────────────────── */}
            <div style={card}>
              <h2 style={secTitle}>Credit Burn</h2>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={creditBurnData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND_PURPLE} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      interval={Math.max(Math.floor(creditBurnData.length / 6), 0)}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      y={redZoneThreshold}
                      stroke={RED}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                      label={{
                        value: '20% zone',
                        fill: RED,
                        fontSize: 9,
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      stroke={BRAND_PURPLE}
                      strokeWidth={2}
                      fill="url(#burnGrad)"
                      name="Remaining"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke={BRAND_PURPLE}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="none"
                      name="Projected"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ═══ INTERACTIVE CREDIT USAGE BARS ══════════════════ */}
          <div style={card}>
            <h2 style={secTitle}>Credit Usage by Category</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CREDIT_CATEGORIES.map((cat) => {
                const widthPct = CREDIT_CATEGORIES[0]?.credits
                  ? (cat.credits / CREDIT_CATEGORIES[0].credits) * 100
                  : 0;
                const isUp = cat.trend > 0;
                const selected = categoryFilter === cat.category;
                return (
                  <div
                    key={cat.category}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: selected ? 'var(--brand-dim)' : 'transparent',
                      border: selected ? '1px solid var(--brand-border)' : '1px solid transparent',
                      transition: 'all 150ms ease',
                    }}
                    onClick={() => {
                      setCategoryFilter(selected ? null : cat.category);
                      setTablePage(0);
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseMove={(e) => {
                      setCategoryTooltip({ cat, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = 'transparent';
                      setCategoryTooltip(null);
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}
                      >
                        {cat.category}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: 10,
                            color: isUp ? GREEN : RED,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {isUp ? '+' : ''}
                          {cat.trend}%
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {fmtNum(cat.credits)} ({cat.pct}%)
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--progress-track)',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: selected ? 'var(--brand)' : BRAND_PURPLE,
                          borderRight: selected ? '2px solid var(--brand-light)' : 'none',
                          transition: 'width 300ms ease, background 150ms ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Active category filter pill */}
              {categoryFilter && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginTop: 4,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-dim)',
                    border: '1px solid var(--brand-border)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                    Showing:{' '}
                    <strong style={{ color: 'var(--brand-light)' }}>{categoryFilter}</strong>{' '}
                    renders only
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter(null);
                      setTablePage(0);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Clear filter <X size={11} />
                  </button>
                </div>
              )}

              {/* Total row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px 0',
                  borderTop: '1px solid var(--border)',
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Total
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}
                >
                  {fmtNum(CREDIT_TOTAL)} credits
                </span>
              </div>
            </div>
          </div>

          {/* Credit category hover tooltip (fixed, follows cursor) */}
          {categoryTooltip && (
            <div
              style={{
                position: 'fixed',
                top: categoryTooltip.y + 14,
                left: categoryTooltip.x + 14,
                zIndex: 100,
                pointerEvents: 'none',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: 11,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 160,
              }}
            >
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                {categoryTooltip.cat.category}
              </div>
              <div
                style={{
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>Credits</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {fmtNum(categoryTooltip.cat.credits)}
                </strong>
              </div>
              <div
                style={{
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>Share</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {categoryTooltip.cat.pct}%
                </strong>
              </div>
              <div
                style={{
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>Trend</span>
                <strong
                  style={{
                    color: categoryTooltip.cat.trend > 0 ? GREEN : RED,
                    fontFamily: 'monospace',
                  }}
                >
                  {categoryTooltip.cat.trend > 0 ? '+' : ''}
                  {categoryTooltip.cat.trend}%
                </strong>
              </div>
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '0.5px solid var(--border)',
                  color: 'var(--brand-light)',
                  fontSize: 10,
                  fontStyle: 'italic',
                }}
              >
                {categoryFilter === categoryTooltip.cat.category
                  ? 'Click to clear filter'
                  : 'Click to filter'}
              </div>
            </div>
          )}

          {/* ═══ RENDER HISTORY TABLE ═══════════════════════════ */}
          <div style={card}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ ...secTitle, margin: 0 }}>Render History</h2>
              <button
                type="button"
                style={btnBase}
                onClick={() => {
                  toast.success('Exporting render history CSV...');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Download size={11} />
                Export CSV
              </button>
            </div>

            {/* Filter Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <select
                value={filterProject}
                onChange={(e) => {
                  setFilterProject(e.target.value);
                  setTablePage(0);
                }}
                style={{
                  ...btnBase,
                  padding: '5px 10px',
                  appearance: 'auto',
                  background: 'var(--bg-elevated)',
                }}
              >
                <option value="">All Projects</option>
                {projectNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setTablePage(0);
                }}
                style={{
                  ...btnBase,
                  padding: '5px 10px',
                  appearance: 'auto',
                  background: 'var(--bg-elevated)',
                }}
              >
                <option value="">All Statuses</option>
                <option value="Complete">Complete</option>
                <option value="Failed">Failed</option>
                <option value="Running">Running</option>
              </select>
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setTablePage(0);
                }}
                style={{
                  ...btnBase,
                  padding: '5px 10px',
                  appearance: 'auto',
                  background: 'var(--bg-elevated)',
                }}
              >
                <option value="">All Tiers</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {(filterProject || filterStatus || filterTier || categoryFilter) && (
                <button
                  type="button"
                  style={{ ...btnBase, color: RED }}
                  onClick={() => {
                    setFilterProject('');
                    setFilterStatus('');
                    setFilterTier('');
                    setCategoryFilter(null);
                    setTablePage(0);
                  }}
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Date', 'Project', 'Shot', 'Duration', 'Credits', 'Tier', 'Status', ''].map(
                      (col) => (
                        <th
                          key={col}
                          style={{
                            textAlign: 'left',
                            padding: '8px 10px',
                            fontWeight: 500,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--text-tertiary)',
                            borderBottom: '1px solid var(--border)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const sc = statusColor(row.status);
                    const tc = tierColor(row.tier);
                    const isExpanded = expandedRows.has(row.id);
                    const isFailed = row.status === 'Failed';
                    const isNavigable = !!row.projectId;
                    const isHovered = hoveredRowId === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border)',
                            cursor: isNavigable || isFailed ? 'pointer' : 'default',
                            background: isHovered
                              ? 'var(--bg-hover)'
                              : isExpanded
                                ? 'rgba(248,113,113,0.04)'
                                : 'transparent',
                            transition: 'background 120ms ease',
                          }}
                          onMouseEnter={() => setHoveredRowId(row.id)}
                          onMouseLeave={() => setHoveredRowId(null)}
                          onClick={() => {
                            if (isFailed) {
                              setExpandedRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                return next;
                              });
                              return;
                            }
                            if (isNavigable) {
                              router.push(
                                `/projects/${row.projectId}/timeline?shotId=${row.shotId}`,
                              );
                            }
                          }}
                        >
                          <td
                            style={{
                              padding: '10px 10px',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.date}
                          </td>
                          <td
                            style={{
                              padding: '10px 10px',
                              color: 'var(--text-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {row.project}
                          </td>
                          <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                            {row.shot}
                          </td>
                          <td
                            style={{
                              padding: '10px 10px',
                              color: 'var(--text-secondary)',
                              fontFamily: 'monospace',
                              fontSize: 11,
                            }}
                          >
                            {row.status === 'Running' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div
                                  style={{
                                    width: 80,
                                    height: 4,
                                    borderRadius: 2,
                                    background: 'var(--progress-track)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                  }}
                                  title={`Rendering ${Math.round(runningProgress[row.id] ?? 0)}%`}
                                >
                                  <div
                                    className="running-progress-fill"
                                    style={{
                                      width: `${runningProgress[row.id] ?? 0}%`,
                                      height: '100%',
                                      borderRadius: 2,
                                      transition: 'width 700ms ease',
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    color: 'var(--status-generating-text)',
                                    fontSize: 10,
                                    minWidth: 28,
                                  }}
                                >
                                  {Math.round(runningProgress[row.id] ?? 0)}%
                                </span>
                              </div>
                            ) : (
                              row.duration
                            )}
                          </td>
                          <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                            {row.credits > 0 ? fmtNum(row.credits) : '\u2014'}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={pillBadge(tc.bg, tc.color)}>{row.tier}</span>
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span
                              style={{
                                ...pillBadge(sc.bg, sc.color),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {row.status}
                              {isFailed && (
                                <ChevronDown
                                  size={11}
                                  style={{
                                    transition: 'transform 150ms ease',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                />
                              )}
                            </span>
                          </td>
                          <td style={{ padding: '10px 10px', width: 24, textAlign: 'right' }}>
                            {isNavigable && isHovered && !isFailed && (
                              <ExternalLink size={12} style={{ color: 'var(--text-tertiary)' }} />
                            )}
                          </td>
                        </tr>
                        {/* Expanded failure row */}
                        {isExpanded && isFailed && (
                          <tr>
                            <td
                              colSpan={8}
                              style={{
                                padding: '12px 10px 14px 32px',
                                background: 'rgba(248,113,113,0.04)',
                                borderBottom: '1px solid var(--border)',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <AlertCircle
                                    size={14}
                                    style={{ color: RED, flexShrink: 0, marginTop: 1 }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 11, color: RED, fontWeight: 600 }}>
                                      {row.failureReason
                                        ? FAILURE_LABELS[row.failureReason]
                                        : 'Unknown failure'}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                      This render failed and no credits were charged.
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRetryShot(row.id);
                                    }}
                                    style={{
                                      ...btnBase,
                                      background: 'var(--brand)',
                                      color: '#fff',
                                      border: 'none',
                                      fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.opacity = '0.9';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <RotateCcw size={11} />
                                    Retry shot
                                  </button>
                                  <span style={{ fontSize: 11, color: GREEN, fontWeight: 500 }}>
                                    {fmtNum(Math.max(row.credits, 40))} credits refunded
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Rows per page:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setTablePage(0);
                  }}
                  style={{
                    ...btnBase,
                    padding: '3px 8px',
                    appearance: 'auto',
                    background: 'var(--bg-elevated)',
                    fontSize: 11,
                  }}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Page {tablePage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  style={{ ...btnBase, padding: '4px 8px', opacity: tablePage === 0 ? 0.3 : 1 }}
                  disabled={tablePage === 0}
                  onClick={() => setTablePage(tablePage - 1)}
                >
                  <ChevronLeft size={12} /> Previous
                </button>
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    padding: '4px 8px',
                    opacity: tablePage >= totalPages - 1 ? 0.3 : 1,
                  }}
                  disabled={tablePage >= totalPages - 1}
                  onClick={() => setTablePage(tablePage + 1)}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ CONTENT PERFORMANCE ════════════════════════════ */}
          <div>
            <h2 style={secTitle}>Content Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {PLATFORM_DATA.map((plat) => {
                const icons: Record<Platform, React.ReactNode> = {
                  youtube: <MonitorPlay size={16} />,
                  tiktok: <Play size={16} />,
                  meta: <Share2 size={16} />,
                };
                const names: Record<Platform, string> = {
                  youtube: 'YouTube',
                  tiktok: 'TikTok',
                  meta: 'Meta',
                };
                const connected = connectedPlatforms.has(plat.platform);

                return (
                  <div key={plat.platform} style={card}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: connected ? BRAND_PURPLE : 'var(--text-tertiary)' }}>
                          {icons[plat.platform]}
                        </span>
                        <span
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
                        >
                          {names[plat.platform]}
                        </span>
                      </div>
                      <button
                        type="button"
                        style={{
                          ...btnBase,
                          padding: '4px 10px',
                          fontSize: 11,
                          background: connected ? 'rgba(167,139,250,0.1)' : 'transparent',
                          color: connected ? BRAND_PURPLE : 'var(--text-secondary)',
                        }}
                        onClick={() => {
                          const next = new Set(connectedPlatforms);
                          if (connected) next.delete(plat.platform);
                          else next.add(plat.platform);
                          setConnectedPlatforms(next);
                          toast.success(
                            connected
                              ? `Disconnected ${names[plat.platform]}`
                              : `Connected ${names[plat.platform]}`,
                          );
                        }}
                      >
                        {connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>

                    {connected && plat.bestVideo ? (
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            margin: '0 0 4px',
                            fontWeight: 500,
                          }}
                        >
                          Best performing: {plat.bestVideo.title}
                        </p>
                        <p
                          style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px' }}
                        >
                          {fmtNum(plat.bestVideo.views)} views | {plat.bestVideo.retention[0]}% peak
                          retention
                        </p>
                        <div
                          style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}
                        >
                          {plat.bestVideo.retention.map((val, idx) => (
                            <div
                              key={idx}
                              style={{
                                flex: 1,
                                height: `${val * 0.4}px`,
                                background: BRAND_PURPLE,
                                opacity: 0.5 + val / 200,
                                borderRadius: '2px 2px 0 0',
                              }}
                              title={`Shot ${idx + 1}: ${val}% retention`}
                            />
                          ))}
                        </div>
                        <p
                          style={{
                            fontSize: 9,
                            color: 'var(--text-tertiary)',
                            margin: '4px 0 0',
                            textAlign: 'center',
                          }}
                        >
                          Retention by shot
                        </p>
                      </div>
                    ) : connected ? (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                        No analytics data yet.
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                        Connect to view performance metrics
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ TOP PROJECTS ═══════════════════════════════════ */}
          <div style={card}>
            <h2 style={secTitle}>Top Projects</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TOP_PROJECTS_DATA.map((proj, i) => {
                const maxCredits = TOP_PROJECTS_DATA[0]?.credits ?? 0;
                const widthPct = (proj.credits / maxCredits) * 100;
                return (
                  <div
                    key={proj.name}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      transition: 'background 150ms ease',
                    }}
                    onClick={() => setDrawerProject(proj)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-tertiary)',
                            width: 18,
                          }}
                        >
                          #{i + 1}
                        </span>
                        <span
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}
                        >
                          {proj.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {fmtNum(proj.credits)} cr
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--bg-overlay, rgba(255,255,255,0.04))',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: BRAND_PURPLE,
                          opacity: 1 - i * 0.2,
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ FAILED RENDER ANALYSIS ═════════════════════════ */}
          {hasFailures && (
            <div style={card}>
              <h2 style={secTitle}>Failed Render Analysis</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Failure Reasons Bar Chart */}
                <div>
                  <p style={{ ...lbl, marginBottom: 10 }}>Failure Reasons</p>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={FAILURE_ANALYSIS.map((f) => ({
                          name: FAILURE_LABELS[f.reason],
                          count: f.count,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={120}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="count"
                          fill={RED}
                          radius={[0, 4, 4, 0]}
                          name="Failures"
                          barSize={14}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Retry Success Rate */}
                <div>
                  <p style={{ ...lbl, marginBottom: 10 }}>Retry Success Rate</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {FAILURE_ANALYSIS.map((f) => (
                      <div key={f.reason}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {FAILURE_LABELS[f.reason]}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color:
                                f.retrySuccessRate >= 0.7
                                  ? GREEN
                                  : f.retrySuccessRate >= 0.4
                                    ? AMBER
                                    : RED,
                            }}
                          >
                            {Math.round(f.retrySuccessRate * 100)}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 6,
                            borderRadius: 3,
                            background: 'var(--bg-overlay, rgba(255,255,255,0.04))',
                          }}
                        >
                          <div
                            style={{
                              width: `${f.retrySuccessRate * 100}%`,
                              height: '100%',
                              borderRadius: 3,
                              background:
                                f.retrySuccessRate >= 0.7
                                  ? GREEN
                                  : f.retrySuccessRate >= 0.4
                                    ? AMBER
                                    : RED,
                              transition: 'width 300ms ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ═══ PROJECT DRILL-DOWN DRAWER ════════════════════════ */}
        {drawerProject && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 98,
              }}
              onClick={() => setDrawerProject(null)}
            />
            {/* Drawer */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 400,
                background: 'var(--bg-elevated)',
                borderLeft: '1px solid var(--border)',
                zIndex: 99,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <h3
                  style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
                >
                  {drawerProject.name}
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  onClick={() => setDrawerProject(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                {/* Summary */}
                <div>
                  <p style={lbl}>Generation Summary</p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <div style={{ ...card, padding: 12 }}>
                      <p style={{ ...lbl, fontSize: 9 }}>Total Renders</p>
                      <p style={{ ...valBig, fontSize: 18 }}>{fmtNum(drawerProject.renders)}</p>
                    </div>
                    <div style={{ ...card, padding: 12 }}>
                      <p style={{ ...lbl, fontSize: 9 }}>Total Credits</p>
                      <p style={{ ...valBig, fontSize: 18 }}>{fmtNum(drawerProject.credits)}</p>
                    </div>
                  </div>
                </div>

                {/* Credits by Tier */}
                <div>
                  <p style={lbl}>Credits by Tier</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {(['standard', 'pro', 'ultra'] as const).map((tier) => {
                      const val = drawerProject.tierBreakdown[tier];
                      const maxTier = Math.max(
                        drawerProject.tierBreakdown.standard,
                        drawerProject.tierBreakdown.pro,
                        drawerProject.tierBreakdown.ultra,
                      );
                      const colors = { standard: '#94a3b8', pro: BRAND_PURPLE, ultra: AMBER };
                      return (
                        <div key={tier}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-secondary)',
                                textTransform: 'capitalize',
                              }}
                            >
                              {tier}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-tertiary)',
                                fontFamily: 'monospace',
                              }}
                            >
                              {fmtNum(val)}
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: 8,
                              borderRadius: 4,
                              background: 'var(--bg-overlay, rgba(255,255,255,0.04))',
                            }}
                          >
                            <div
                              style={{
                                width: `${(val / maxTier) * 100}%`,
                                height: '100%',
                                borderRadius: 4,
                                background: colors[tier],
                                transition: 'width 300ms ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generation Timeline Sparkline */}
                <div>
                  <p style={lbl}>Generation Timeline (14 days)</p>
                  <div style={{ marginTop: 8, height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={drawerProject.timeline}
                        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                      >
                        <defs>
                          <linearGradient id="drawerGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BRAND_PURPLE} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke={BRAND_PURPLE}
                          strokeWidth={1.5}
                          fill="url(#drawerGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Character */}
                <div>
                  <p style={lbl}>Top Character</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      margin: '6px 0 0',
                    }}
                  >
                    {drawerProject.topCharacter}
                  </p>
                </div>

                {/* Open Project Button */}
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    justifyContent: 'center',
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    padding: '10px 16px',
                    width: '100%',
                    marginTop: 'auto',
                  }}
                  onClick={() => toast.info(`Opening ${drawerProject.name}...`)}
                >
                  <ExternalLink size={13} />
                  Open project
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading analytics...</div>
      }
    >
      <AnalyticsPageContent />
    </Suspense>
  );
}
