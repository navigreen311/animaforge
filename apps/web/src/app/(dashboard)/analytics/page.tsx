'use client';

import { BarChart3, TrendingUp, Clock, Zap } from 'lucide-react';

// ── Sample Data ──────────────────────────────────────────────

interface RenderHistoryRow {
  date: string;
  project: string;
  shot: string;
  duration: string;
  credits: number;
  status: 'Complete' | 'Failed' | 'Running';
}

const RENDER_HISTORY: RenderHistoryRow[] = [
  { date: 'Mar 24, 2026', project: 'Hero Promo',       shot: 'Shot 12 - Finale',    duration: '3m 12s', credits: 180, status: 'Complete' },
  { date: 'Mar 24, 2026', project: 'Product Launch',    shot: 'Shot 3 - Unboxing',   duration: '1m 47s', credits: 120, status: 'Complete' },
  { date: 'Mar 23, 2026', project: 'Hero Promo',       shot: 'Shot 8 - Battle',      duration: '—',      credits: 0,   status: 'Running'  },
  { date: 'Mar 23, 2026', project: 'Brand Story',      shot: 'Shot 1 - Intro',       duration: '2m 05s', credits: 140, status: 'Complete' },
  { date: 'Mar 22, 2026', project: 'Product Launch',    shot: 'Shot 7 - CTA',         duration: '0m 58s', credits: 80,  status: 'Failed'   },
  { date: 'Mar 22, 2026', project: 'Tutorial Series',   shot: 'Shot 2 - Setup',       duration: '4m 31s', credits: 200, status: 'Complete' },
  { date: 'Mar 21, 2026', project: 'Brand Story',      shot: 'Shot 5 - Montage',     duration: '2m 22s', credits: 160, status: 'Complete' },
  { date: 'Mar 20, 2026', project: 'Hero Promo',       shot: 'Shot 4 - Aerial',      duration: '1m 15s', credits: 95,  status: 'Failed'   },
];

interface CreditUsageItem {
  label: string;
  value: number;
}

const CREDIT_USAGE: CreditUsageItem[] = [
  { label: 'Video Generation', value: 2100 },
  { label: 'Audio',            value: 680  },
  { label: 'Style Transfer',   value: 520  },
  { label: 'Script AI',        value: 460  },
  { label: 'Avatar',           value: 440  },
];

interface TopProject {
  name: string;
  credits: number;
}

const TOP_PROJECTS: TopProject[] = [
  { name: 'Hero Promo',      credits: 1_840 },
  { name: 'Product Launch',   credits: 1_260 },
  { name: 'Brand Story',     credits: 780   },
];

const TOP_PROJECTS_MAX = Math.max(...TOP_PROJECTS.map((p) => p.credits));
const CREDIT_USAGE_MAX = Math.max(...CREDIT_USAGE.map((c) => c.value));

// ── Shared Styles ────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  letterSpacing: '0.05em',
  fontWeight: 500,
  margin: 0,
};

const valueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '4px 0 2px',
};

const subStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-tertiary)',
  margin: 0,
};

// ── Status badge helper ──────────────────────────────────────

function statusBadge(status: RenderHistoryRow['status']) {
  const map: Record<
    RenderHistoryRow['status'],
    { bg: string; color: string }
  > = {
    Complete: { bg: 'var(--status-approved-bg, rgba(34,197,94,0.12))',  color: 'var(--status-approved-text, #4ade80)' },
    Failed:   { bg: 'var(--status-rejected-bg, rgba(239,68,68,0.12))', color: 'var(--status-rejected-text, #f87171)' },
    Running:  { bg: 'var(--status-generating-bg, rgba(234,179,8,0.12))', color: 'var(--status-generating-text, #facc15)' },
  };
  const s = map[status];

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 'var(--radius-lg)',
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Analytics
        </h1>

        <button
          type="button"
          style={{
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
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          Last 30 days &#9662;
        </button>
      </div>

      {/* ── Scrollable Content ──────────────────────────────── */}
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
        {/* ── Stats Row (4 cards) ────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          {/* Total Renders */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <BarChart3 size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={labelStyle}>Total Renders</p>
            </div>
            <p style={valueStyle}>847</p>
            <p style={subStyle}>+12% from last period</p>
          </div>

          {/* Credits Spent */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Zap size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={labelStyle}>Credits Spent</p>
            </div>
            <p style={valueStyle}>4,200</p>
            <p style={subStyle}>of 10,000 allocated</p>
          </div>

          {/* Avg Render Time */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={labelStyle}>Avg Render Time</p>
            </div>
            <p style={valueStyle}>2m 34s</p>
            <p style={subStyle}>-8s from last period</p>
          </div>

          {/* Success Rate */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <TrendingUp size={12} style={{ color: 'var(--text-tertiary)' }} />
              <p style={labelStyle}>Success Rate</p>
            </div>
            <p style={valueStyle}>96.2%</p>
            <p style={subStyle}>+1.4% from last period</p>
          </div>
        </div>

        {/* ── Render History ─────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Render History</h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {['Date', 'Project', 'Shot', 'Duration', 'Credits', 'Status'].map((col) => (
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
                {RENDER_HISTORY.map((row, i) => (
                  <tr
                    key={`${row.date}-${row.shot}-${i}`}
                    style={{
                      borderBottom:
                        i < RENDER_HISTORY.length - 1
                          ? '1px solid var(--border)'
                          : 'none',
                    }}
                  >
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {row.date}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {row.project}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                      {row.shot}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                      {row.duration}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                      {row.credits > 0 ? row.credits.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      {statusBadge(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Two-Column Layout ───────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 12,
          }}
        >
          {/* ── Credit Usage (horizontal bar chart) ──────────── */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Credit Usage</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CREDIT_USAGE.map((item, i) => {
                const widthPct = (item.value / CREDIT_USAGE_MAX) * 100;
                // Decreasing opacity: 1.0, 0.8, 0.65, 0.5, 0.4
                const opacities = [1.0, 0.8, 0.65, 0.5, 0.4];
                const opacity = opacities[i] ?? 0.4;

                return (
                  <div key={item.label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {item.value.toLocaleString()}
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
                          width: `${widthPct}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: 'var(--brand)',
                          opacity,
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Top Projects ─────────────────────────────────── */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Top Projects</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP_PROJECTS.map((project, i) => {
                const widthPct = (project.credits / TOP_PROJECTS_MAX) * 100;

                return (
                  <div key={project.name}>
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
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {project.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {project.credits.toLocaleString()} cr
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
                          background: 'var(--brand)',
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
        </div>
      </main>
    </div>
  );
}
