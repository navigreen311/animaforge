'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  BarChart3, TrendingUp, Clock, Zap, ChevronDown, Download, X,
  MonitorPlay, Play, Share2, AlertTriangle, RotateCcw, ExternalLink,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type DateRange = 'today' | '7d' | '30d' | '90d' | '12m' | 'custom';
type RenderStatus = 'Complete' | 'Failed' | 'Running';
type RenderTier = 'Standard' | 'Pro' | 'Ultra';
type CreditCategory = 'Video' | 'Audio' | 'Style' | 'Avatar' | 'Script';
type FailureReason = 'content_moderation' | 'insufficient_credits' | 'timeout' | 'gpu_oom' | 'model_error';
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
  shot: string;
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
  name: string;
  credits: number;
  renders: number;
  tierBreakdown: { standard: number; pro: number; ultra: number };
  timeline: { day: string; count: number }[];
  topCharacter: string;
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
  const now = new Date(2026, 2, 25); // Mar 25, 2026
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

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSnapshots(days: number): DaySnapshot[] {
  const dates = generateDateLabels(days);
  const rand = seededRand(42);
  let remaining = 10000;
  return dates.map((d) => {
    const completed = Math.floor(20 + rand() * 20);
    const failed = Math.floor(rand() * 3);
    const creditsUsed = Math.floor(100 + rand() * 80);
    remaining = Math.max(0, remaining - creditsUsed);
    return {
      date: d.date,
      label: d.label,
      completed,
      failed,
      creditsUsed,
      creditsRemaining: remaining,
      avgRenderSec: Math.floor(120 + rand() * 80),
      successRate: parseFloat((95 + rand() * 4.5).toFixed(1)),
    };
  });
}

const ALL_SNAPSHOTS_90 = generateSnapshots(90);
const ALL_SNAPSHOTS_365 = generateSnapshots(365);

function getSnapshots(range: DateRange): DaySnapshot[] {
  switch (range) {
    case 'today': return ALL_SNAPSHOTS_90.slice(-1);
    case '7d': return ALL_SNAPSHOTS_90.slice(-7);
    case '30d': return ALL_SNAPSHOTS_90.slice(-30);
    case '90d': return ALL_SNAPSHOTS_90;
    case '12m': return ALL_SNAPSHOTS_365;
    case 'custom': return ALL_SNAPSHOTS_90.slice(-30);
    default: return ALL_SNAPSHOTS_90.slice(-30);
  }
}

const PROJECTS = ['Hero Promo', 'Product Launch', 'Brand Story', 'Tutorial Series', 'Social Campaign'];
const SHOTS = ['Intro', 'Battle', 'Unboxing', 'CTA', 'Montage', 'Setup', 'Aerial', 'Finale', 'Close-Up', 'Transition'];
const TIERS: RenderTier[] = ['Standard', 'Pro', 'Ultra'];
const FAILURE_REASONS: FailureReason[] = ['content_moderation', 'insufficient_credits', 'timeout', 'gpu_oom', 'model_error'];

function generateRenderHistory(): RenderHistoryRow[] {
  const rand = seededRand(99);
  const rows: RenderHistoryRow[] = [];
  const dates = generateDateLabels(30);
  for (let i = 0; i < 120; i++) {
    const d = dates[Math.floor(rand() * dates.length)];
    const proj = PROJECTS[Math.floor(rand() * PROJECTS.length)];
    const shot = SHOTS[Math.floor(rand() * SHOTS.length)];
    const tier = TIERS[Math.floor(rand() * TIERS.length)];
    const isFailed = rand() < 0.06;
    const isRunning = !isFailed && rand() < 0.03;
    const status: RenderStatus = isFailed ? 'Failed' : isRunning ? 'Running' : 'Complete';
    const credits = status === 'Failed' ? 0 : Math.floor(40 + rand() * 200);
    const mins = Math.floor(rand() * 5);
    const secs = Math.floor(rand() * 60);
    rows.push({
      id: `r-${i}`,
      date: d.label,
      project: proj,
      shot: `Shot ${Math.floor(rand() * 15) + 1} - ${shot}`,
      duration: status === 'Running' ? '\u2014' : `${mins}m ${secs.toString().padStart(2, '0')}s`,
      credits,
      tier,
      status,
      failureReason: isFailed ? FAILURE_REASONS[Math.floor(rand() * FAILURE_REASONS.length)] : undefined,
    });
  }
  // sort by date descending (reverse label order)
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

const ALL_RENDER_HISTORY = generateRenderHistory();

const CREDIT_CATEGORIES: CreditCategoryData[] = [
  { category: 'Video', credits: 2100, pct: 50, trend: 12 },
  { category: 'Audio', credits: 680, pct: 16.2, trend: -5 },
  { category: 'Style', credits: 520, pct: 12.4, trend: 8 },
  { category: 'Avatar', credits: 440, pct: 10.5, trend: 3 },
  { category: 'Script', credits: 460, pct: 11, trend: -2 },
];
const CREDIT_TOTAL = CREDIT_CATEGORIES.reduce((s, c) => s + c.credits, 0);

const TOP_PROJECTS_DATA: TopProjectData[] = [
  {
    name: 'Hero Promo',
    credits: 1840,
    renders: 124,
    tierBreakdown: { standard: 620, pro: 740, ultra: 480 },
    timeline: generateDateLabels(14).map((d, i) => ({ day: d.label, count: 6 + (i % 3) * 2 })),
    topCharacter: 'Captain Nova',
  },
  {
    name: 'Product Launch',
    credits: 1260,
    renders: 89,
    tierBreakdown: { standard: 480, pro: 520, ultra: 260 },
    timeline: generateDateLabels(14).map((d, i) => ({ day: d.label, count: 4 + (i % 4) })),
    topCharacter: 'Brand Bot',
  },
  {
    name: 'Brand Story',
    credits: 780,
    renders: 56,
    tierBreakdown: { standard: 300, pro: 340, ultra: 140 },
    timeline: generateDateLabels(14).map((d, i) => ({ day: d.label, count: 2 + (i % 5) })),
    topCharacter: 'Maya',
  },
];

const PLATFORM_DATA: PlatformData[] = [
  {
    platform: 'youtube',
    connected: false,
    bestVideo: { title: 'AnimaForge Launch Trailer', views: 124_500, retention: [100, 92, 85, 78, 70, 62, 55, 48] },
  },
  { platform: 'tiktok', connected: false },
  { platform: 'meta', connected: false },
];

const FAILURE_ANALYSIS: FailureAnalysis[] = [
  { reason: 'content_moderation', count: 12, retrySuccessRate: 0.25 },
  { reason: 'insufficient_credits', count: 8, retrySuccessRate: 0.88 },
  { reason: 'timeout', count: 5, retrySuccessRate: 0.92 },
  { reason: 'gpu_oom', count: 3, retrySuccessRate: 0.67 },
  { reason: 'model_error', count: 2, retrySuccessRate: 0.50 },
];

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
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  custom: 'Custom',
};

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

function Sparkline({ data, type = 'line', color = BRAND_PURPLE }: { data: number[]; type?: 'line' | 'area' | 'bar'; color?: string }) {
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
          <linearGradient id={`spk-grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#spk-grad-${color.replace('#','')})`} />
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

export default function AnalyticsPage() {
  // ── State ───────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const dateDropdown = useDropdown();
  const exportDropdown = useDropdown();

  const [categoryFilter, setCategoryFilter] = useState<CreditCategory | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [drawerProject, setDrawerProject] = useState<TopProjectData | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<Platform>>(new Set());

  // ── Derived Data ────────────────────────────────────────────
  const snapshots = useMemo(() => getSnapshots(dateRange), [dateRange]);

  const kpis = useMemo(() => {
    const totalRenders = snapshots.reduce((s, d) => s + d.completed + d.failed, 0);
    const creditsSpent = snapshots.reduce((s, d) => s + d.creditsUsed, 0);
    const avgRenderSec = Math.round(snapshots.reduce((s, d) => s + d.avgRenderSec, 0) / snapshots.length);
    const successRate = parseFloat((snapshots.reduce((s, d) => s + d.successRate, 0) / snapshots.length).toFixed(1));
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

  // Credit forecast
  const CREDITS_REMAINING = 5800;
  const DAILY_RATE = 140;
  const daysLeft = Math.round(CREDITS_REMAINING / DAILY_RATE);
  const depletionDate = new Date(2026, 2, 25);
  depletionDate.setDate(depletionDate.getDate() + daysLeft);
  const depletionLabel = depletionDate.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });
  const forecastColor = daysLeft < 7 ? RED : daysLeft < 30 ? RED : daysLeft < 60 ? AMBER : GREEN;
  const forecastPulse = daysLeft < 7;

  // Render volume chart data (use last 30 from snapshots for line chart)
  const renderVolumeData = useMemo(() => {
    const slice = snapshots.slice(-30);
    return slice.map((d) => ({
      name: d.label,
      completed: d.completed,
      failed: d.failed,
    }));
  }, [snapshots]);

  // Credit burn chart data
  const creditBurnData = useMemo(() => {
    const slice = snapshots.slice(-30);
    const startRemaining = 10000;
    let running = startRemaining;
    const actual = slice.map((d) => {
      running -= d.creditsUsed;
      return { name: d.label, remaining: Math.max(running, 0), projected: null as number | null };
    });
    // add projection
    const lastRemaining = actual[actual.length - 1]?.remaining ?? 0;
    const avgBurn = slice.reduce((s, d) => s + d.creditsUsed, 0) / slice.length;
    let proj = lastRemaining;
    for (let i = 1; i <= 15; i++) {
      proj -= avgBurn;
      const futureDate = new Date(2026, 2, 25);
      futureDate.setDate(futureDate.getDate() + i);
      const label = futureDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      actual.push({ name: label, remaining: null as any, projected: Math.max(proj, 0) });
    }
    return actual;
  }, [snapshots]);

  const redZoneThreshold = 10000 * 0.2; // 20% of total

  // Table filtering
  const filteredHistory = useMemo(() => {
    let rows = ALL_RENDER_HISTORY;
    if (categoryFilter) {
      // Filter by category -> project mapping approximation
      rows = rows.filter(() => true); // in real app this would filter
    }
    if (filterProject) rows = rows.filter((r) => r.project === filterProject);
    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    if (filterTier) rows = rows.filter((r) => r.tier === filterTier);
    return rows;
  }, [categoryFilter, filterProject, filterStatus, filterTier]);

  const totalPages = Math.ceil(filteredHistory.length / perPage);
  const pageRows = filteredHistory.slice(tablePage * perPage, (tablePage + 1) * perPage);
  const failedRows = ALL_RENDER_HISTORY.filter((r) => r.status === 'Failed');
  const hasFailures = failedRows.length > 0;

  // Export handlers
  const handleExport = useCallback((type: string) => {
    toast.success(`Exporting ${type}...`);
    exportDropdown.setOpen(false);
  }, [exportDropdown]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {DATE_RANGE_LABELS[dateRange]}
              <ChevronDown size={12} />
            </button>
            {dateDropdown.open && (
              <div style={dropdownMenu}>
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    style={{
                      ...dropdownItem,
                      background: key === dateRange ? 'var(--bg-hover)' : 'transparent',
                      fontWeight: key === dateRange ? 600 : 400,
                    }}
                    onClick={() => { setDateRange(key); dateDropdown.setOpen(false); setTablePage(0); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = key === dateRange ? 'var(--bg-hover)' : 'transparent'; }}
                  >
                    {DATE_RANGE_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div ref={exportDropdown.ref} style={{ position: 'relative' }}>
            <button
              type="button"
              style={btnBase}
              onClick={() => exportDropdown.setOpen(!exportDropdown.open)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Download size={12} />
              Export
              <ChevronDown size={12} />
            </button>
            {exportDropdown.open && (
              <div style={dropdownMenu}>
                <button type="button" style={dropdownItem} onClick={() => handleExport('CSV Render History')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  CSV Render History
                </button>
                <button type="button" style={dropdownItem} onClick={() => handleExport('CSV Credit Usage')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  CSV Credit Usage
                </button>
                <button type="button" style={dropdownItem} onClick={() => handleExport('PDF Full Report')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  PDF Full Report
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
              At your current rate (<strong style={{ color: 'var(--text-primary)' }}>{fmtNum(DAILY_RATE)} credits/day</strong>),
              your <strong style={{ color: 'var(--text-primary)' }}>{fmtNum(CREDITS_REMAINING)} remaining credits</strong> will
              last <strong style={{ color: forecastColor }}>~{daysLeft} days</strong> (until {depletionLabel})
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={valBig}>{fmtNum(kpis.totalRenders)}</p>
              <Sparkline data={sparkData.renders} type="bar" color={BRAND_PURPLE} />
            </div>
            <p style={{ fontSize: 10, color: GREEN, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={10} /> +12% from last period
            </p>
          </div>

          {/* Credits Spent */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Zap size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={lbl}>Credits Spent</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={valBig}>{fmtNum(kpis.creditsSpent)}</p>
              <Sparkline data={sparkData.credits} type="area" color={BRAND_PURPLE} />
            </div>
            <p style={{ fontSize: 10, color: RED, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={10} /> +18% from last period
            </p>
          </div>

          {/* Avg Render Time */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={lbl}>Avg Render Time</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={valBig}>{fmtSec(kpis.avgRenderSec)}</p>
              <Sparkline data={sparkData.avgTime} type="line" color={GREEN} />
            </div>
            <p style={{ fontSize: 10, color: GREEN, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowDownRight size={10} /> -8s from last period
            </p>
          </div>

          {/* Success Rate */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <TrendingUp size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={lbl}>Success Rate</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={valBig}>{kpis.successRate}%</p>
              <Sparkline data={sparkData.success} type="line" color={BRAND_PURPLE} />
            </div>
            <p style={{ fontSize: 10, color: GREEN, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
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
                <LineChart data={renderVolumeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                <AreaChart data={creditBurnData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    label={{ value: '20% zone', fill: RED, fontSize: 9, position: 'insideTopRight' }}
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
              const widthPct = (cat.credits / CREDIT_CATEGORIES[0].credits) * 100;
              const isUp = cat.trend > 0;
              const selected = categoryFilter === cat.category;
              return (
                <div
                  key={cat.category}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: selected ? 'rgba(167,139,250,0.08)' : 'transparent',
                    border: selected ? '1px solid rgba(167,139,250,0.2)' : '1px solid transparent',
                    transition: 'all 150ms ease',
                  }}
                  onClick={() => setCategoryFilter(selected ? null : cat.category)}
                  onMouseEnter={(e) => {
                    if (!selected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) e.currentTarget.style.background = 'transparent';
                  }}
                  title={`${cat.category}: ${fmtNum(cat.credits)} credits (${cat.pct}%) | Trend: ${isUp ? '+' : ''}${cat.trend}%`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {cat.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, color: isUp ? GREEN : RED, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {isUp ? '+' : ''}{cat.trend}%
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {fmtNum(cat.credits)} ({cat.pct}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-overlay, rgba(255,255,255,0.04))' }}>
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: BRAND_PURPLE,
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {fmtNum(CREDIT_TOTAL)} credits
              </span>
            </div>
          </div>
        </div>

        {/* ═══ RENDER HISTORY TABLE ═══════════════════════════ */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ ...secTitle, margin: 0 }}>Render History</h2>
            <button
              type="button"
              style={btnBase}
              onClick={() => { toast.success('Exporting render history CSV...'); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Download size={11} />
              Export CSV
            </button>
          </div>

          {/* Filter Row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <select
              value={filterProject}
              onChange={(e) => { setFilterProject(e.target.value); setTablePage(0); }}
              style={{
                ...btnBase,
                padding: '5px 10px',
                appearance: 'auto',
                background: 'var(--bg-elevated)',
              }}
            >
              <option value="">All Projects</option>
              {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setTablePage(0); }}
              style={{ ...btnBase, padding: '5px 10px', appearance: 'auto', background: 'var(--bg-elevated)' }}
            >
              <option value="">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="Failed">Failed</option>
              <option value="Running">Running</option>
            </select>
            <select
              value={filterTier}
              onChange={(e) => { setFilterTier(e.target.value); setTablePage(0); }}
              style={{ ...btnBase, padding: '5px 10px', appearance: 'auto', background: 'var(--bg-elevated)' }}
            >
              <option value="">All Tiers</option>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterProject || filterStatus || filterTier || categoryFilter) && (
              <button
                type="button"
                style={{ ...btnBase, color: RED }}
                onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterTier(''); setCategoryFilter(null); setTablePage(0); }}
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
                  {['Date', 'Project', 'Shot', 'Duration', 'Credits', 'Tier', 'Status'].map((col) => (
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => {
                  const sc = statusColor(row.status);
                  const tc = tierColor(row.tier);
                  const isExpanded = expandedRow === row.id;
                  const isFailed = row.status === 'Failed';
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: isFailed ? 'pointer' : 'default',
                          background: isExpanded ? 'rgba(248,113,113,0.04)' : 'transparent',
                        }}
                        onClick={() => {
                          if (isFailed) setExpandedRow(isExpanded ? null : row.id);
                        }}
                      >
                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {row.date}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {row.project}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>{row.shot}</td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                          {row.duration}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                          {row.credits > 0 ? fmtNum(row.credits) : '\u2014'}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={pillBadge(tc.bg, tc.color)}>{row.tier}</span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={pillBadge(sc.bg, sc.color)}>{row.status}</span>
                        </td>
                      </tr>
                      {/* Expanded failure row */}
                      {isExpanded && isFailed && (
                        <tr>
                          <td colSpan={7} style={{ padding: '8px 10px 12px 32px', background: 'rgba(248,113,113,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AlertTriangle size={12} style={{ color: RED }} />
                              <span style={{ fontSize: 11, color: RED, fontWeight: 500 }}>
                                Failure reason: {row.failureReason ? FAILURE_LABELS[row.failureReason] : 'Unknown'}
                              </span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setTablePage(0); }}
                style={{ ...btnBase, padding: '3px 8px', appearance: 'auto', background: 'var(--bg-elevated)', fontSize: 11 }}
              >
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
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
                style={{ ...btnBase, padding: '4px 8px', opacity: tablePage >= totalPages - 1 ? 0.3 : 1 }}
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
              const names: Record<Platform, string> = { youtube: 'YouTube', tiktok: 'TikTok', meta: 'Meta' };
              const connected = connectedPlatforms.has(plat.platform);

              return (
                <div key={plat.platform} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: connected ? BRAND_PURPLE : 'var(--text-tertiary)' }}>{icons[plat.platform]}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{names[plat.platform]}</span>
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
                        toast.success(connected ? `Disconnected ${names[plat.platform]}` : `Connected ${names[plat.platform]}`);
                      }}
                    >
                      {connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>

                  {connected && plat.bestVideo ? (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>
                        Best performing: {plat.bestVideo.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                        {fmtNum(plat.bestVideo.views)} views | {plat.bestVideo.retention[0]}% peak retention
                      </p>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}>
                        {plat.bestVideo.retention.map((val, idx) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              height: `${val * 0.4}px`,
                              background: BRAND_PURPLE,
                              opacity: 0.5 + (val / 200),
                              borderRadius: '2px 2px 0 0',
                            }}
                            title={`Shot ${idx + 1}: ${val}% retention`}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: 9, color: 'var(--text-tertiary)', margin: '4px 0 0', textAlign: 'center' }}>
                        Retention by shot
                      </p>
                    </div>
                  ) : connected ? (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>No analytics data yet.</p>
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
              const maxCredits = TOP_PROJECTS_DATA[0].credits;
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', width: 18 }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {proj.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      {fmtNum(proj.credits)} cr
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--bg-overlay, rgba(255,255,255,0.04))' }}>
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
                      data={FAILURE_ANALYSIS.map((f) => ({ name: FAILURE_LABELS[f.reason], count: f.count }))}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" fill={RED} radius={[0, 4, 4, 0]} name="Failures" barSize={14} />
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{FAILURE_LABELS[f.reason]}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: f.retrySuccessRate >= 0.7 ? GREEN : f.retrySuccessRate >= 0.4 ? AMBER : RED }}>
                          {Math.round(f.retrySuccessRate * 100)}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--bg-overlay, rgba(255,255,255,0.04))' }}>
                        <div
                          style={{
                            width: `${f.retrySuccessRate * 100}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: f.retrySuccessRate >= 0.7 ? GREEN : f.retrySuccessRate >= 0.4 ? AMBER : RED,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {drawerProject.name}
              </h3>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                onClick={() => setDrawerProject(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary */}
              <div>
                <p style={lbl}>Generation Summary</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
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
                    const maxTier = Math.max(drawerProject.tierBreakdown.standard, drawerProject.tierBreakdown.pro, drawerProject.tierBreakdown.ultra);
                    const colors = { standard: '#94a3b8', pro: BRAND_PURPLE, ultra: AMBER };
                    return (
                      <div key={tier}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tier}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{fmtNum(val)}</span>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-overlay, rgba(255,255,255,0.04))' }}>
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
                    <AreaChart data={drawerProject.timeline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id="drawerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BRAND_PURPLE} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="count" stroke={BRAND_PURPLE} strokeWidth={1.5} fill="url(#drawerGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Character */}
              <div>
                <p style={lbl}>Top Character</p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, margin: '6px 0 0' }}>
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
  );
}
