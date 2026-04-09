'use client';

import { useState, useEffect, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type JobStatus = 'running' | 'queued' | 'complete' | 'failed';
type RenderTier = 'standard' | 'priority' | 'express';

interface RenderJob {
  id: string;
  projectName: string;
  shotLabel: string;
  tier: RenderTier;
  status: JobStatus;
  progress: number;
  eta?: string;
  duration?: string;
  completedAt?: string;
  resolution: string;
  credits: number;
  errorReason?: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_JOBS: RenderJob[] = [
  // Running
  { id: 'rj-001', projectName: 'Neon Horizons', shotLabel: 'Shot 3 / 10', tier: 'priority', status: 'running', progress: 62, eta: '~4 min', resolution: '4K', credits: 45 },
  { id: 'rj-002', projectName: 'Brand Intro', shotLabel: 'Shot 1 / 5', tier: 'express', status: 'running', progress: 28, eta: '~9 min', resolution: '4K', credits: 60 },
  // Complete
  { id: 'rj-003', projectName: 'Neon Horizons', shotLabel: 'Shot 1 / 10', tier: 'standard', status: 'complete', progress: 100, duration: '6m 12s', completedAt: '2026-04-09T08:21:00Z', resolution: '1080p', credits: 20 },
  { id: 'rj-004', projectName: 'Neon Horizons', shotLabel: 'Shot 2 / 10', tier: 'standard', status: 'complete', progress: 100, duration: '5m 48s', completedAt: '2026-04-09T08:15:00Z', resolution: '1080p', credits: 20 },
  { id: 'rj-005', projectName: 'Product Demo', shotLabel: 'Shot 1 / 3', tier: 'priority', status: 'complete', progress: 100, duration: '4m 33s', completedAt: '2026-04-09T07:50:00Z', resolution: '4K', credits: 45 },
  { id: 'rj-006', projectName: 'Product Demo', shotLabel: 'Shot 2 / 3', tier: 'priority', status: 'complete', progress: 100, duration: '4m 50s', completedAt: '2026-04-09T07:45:00Z', resolution: '4K', credits: 45 },
  { id: 'rj-007', projectName: 'Product Demo', shotLabel: 'Shot 3 / 3', tier: 'standard', status: 'complete', progress: 100, duration: '7m 20s', completedAt: '2026-04-09T07:30:00Z', resolution: '1080p', credits: 20 },
  { id: 'rj-008', projectName: 'Social Clips', shotLabel: 'Shot 1 / 4', tier: 'standard', status: 'complete', progress: 100, duration: '3m 10s', completedAt: '2026-04-09T06:55:00Z', resolution: '720p', credits: 12 },
  { id: 'rj-009', projectName: 'Social Clips', shotLabel: 'Shot 2 / 4', tier: 'standard', status: 'complete', progress: 100, duration: '3m 22s', completedAt: '2026-04-09T06:50:00Z', resolution: '720p', credits: 12 },
  { id: 'rj-010', projectName: 'Social Clips', shotLabel: 'Shot 3 / 4', tier: 'standard', status: 'complete', progress: 100, duration: '2m 58s', completedAt: '2026-04-09T06:40:00Z', resolution: '720p', credits: 12 },
  { id: 'rj-011', projectName: 'Social Clips', shotLabel: 'Shot 4 / 4', tier: 'standard', status: 'complete', progress: 100, duration: '3m 05s', completedAt: '2026-04-09T06:35:00Z', resolution: '720p', credits: 12 },
  { id: 'rj-012', projectName: 'Music Video', shotLabel: 'Shot 1 / 8', tier: 'priority', status: 'complete', progress: 100, duration: '5m 15s', completedAt: '2026-04-09T06:20:00Z', resolution: '4K', credits: 45 },
  { id: 'rj-013', projectName: 'Music Video', shotLabel: 'Shot 2 / 8', tier: 'standard', status: 'complete', progress: 100, duration: '6m 40s', completedAt: '2026-04-09T06:10:00Z', resolution: '1080p', credits: 20 },
  { id: 'rj-014', projectName: 'Music Video', shotLabel: 'Shot 3 / 8', tier: 'standard', status: 'complete', progress: 100, duration: '7m 02s', completedAt: '2026-04-09T06:00:00Z', resolution: '1080p', credits: 20 },
  // Failed
  { id: 'rj-015', projectName: 'Brand Intro', shotLabel: 'Shot 2 / 5', tier: 'standard', status: 'failed', progress: 0, resolution: '4K', credits: 0, errorReason: 'GPU memory exceeded during upscaling pass. Try reducing resolution to 1080p or splitting the shot into shorter segments.' },
];

/* ------------------------------------------------------------------ */
/*  Tier badge                                                         */
/* ------------------------------------------------------------------ */

function TierBadge({ tier }: { tier: RenderTier }) {
  const cfg: Record<RenderTier, { bg: string; text: string; border: string }> = {
    standard: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)', border: 'var(--border)' },
    priority: { bg: 'rgba(124,58,237,0.12)', text: 'var(--brand-light, #a78bfa)', border: 'var(--brand-border, rgba(124,58,237,0.35))' },
    express: { bg: 'rgba(234,179,8,0.12)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)' },
  };
  const c = cfg[tier];
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-pill, 20px)', background: c.bg, color: c.text, border: `1px solid ${c.border}`, textTransform: 'capitalize' }}>
      {tier}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg: Record<JobStatus, { bg: string; text: string; border: string; label: string }> = {
    running: { bg: 'rgba(96,165,250,0.12)', text: '#93c5fd', border: 'rgba(96,165,250,0.3)', label: 'Running' },
    queued: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)', border: 'var(--border)', label: 'Queued' },
    complete: { bg: 'rgba(52,211,153,0.12)', text: '#6ee7b7', border: 'rgba(52,211,153,0.3)', label: 'Complete' },
    failed: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Failed' },
  };
  const c = cfg[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-pill, 20px)', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats card                                                         */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated, #13131f)',
        border: '1px solid var(--border, rgba(255,255,255,0.07))',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '14px 16px',
        flex: 1,
        minWidth: 130,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-tertiary, rgba(226,232,240,0.28))', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--text-primary, #e2e8f0)' }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function RenderQueuePage() {
  const [jobs, setJobs] = useState<RenderJob[]>(INITIAL_JOBS);
  const [activeTab, setActiveTab] = useState<'all' | JobStatus>('all');
  const [expandedFailed, setExpandedFailed] = useState<Set<string>>(new Set());
  const [completePage, setCompletePage] = useState(0);
  const [sortCol, setSortCol] = useState<'project' | 'shot' | 'duration' | 'credits' | 'completed'>('completed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const COMPLETE_PER_PAGE = 8;

  // ── Simulated progress ────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.status !== 'running') return j;
          const next = Math.min(j.progress + Math.random() * 3, 99.5);
          return { ...j, progress: Math.round(next * 10) / 10 };
        }),
      );
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  // ── Derived stats ─────────────────────────────────────────
  const todayJobs = jobs.length;
  const completeCount = jobs.filter((j) => j.status === 'complete').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  const creditsUsed = jobs.reduce((s, j) => s + j.credits, 0);
  const avgTime = '4m 52s';
  const successRate = todayJobs > 0 ? Math.round((completeCount / (completeCount + failedCount)) * 100) : 0;

  // ── Filtered jobs ─────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    if (activeTab === 'all') return jobs;
    return jobs.filter((j) => j.status === activeTab);
  }, [jobs, activeTab]);

  const runningJobs = filteredJobs.filter((j) => j.status === 'running');
  const queuedJobs = filteredJobs.filter((j) => j.status === 'queued');
  const failedJobs = filteredJobs.filter((j) => j.status === 'failed');

  // ── Sorted complete jobs ──────────────────────────────────
  const completeJobs = useMemo(() => {
    const cj = filteredJobs.filter((j) => j.status === 'complete');
    cj.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'project': cmp = a.projectName.localeCompare(b.projectName); break;
        case 'shot': cmp = a.shotLabel.localeCompare(b.shotLabel); break;
        case 'duration': cmp = (a.duration || '').localeCompare(b.duration || ''); break;
        case 'credits': cmp = a.credits - b.credits; break;
        case 'completed': cmp = (a.completedAt || '').localeCompare(b.completedAt || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return cj;
  }, [filteredJobs, sortCol, sortDir]);

  const totalCompletePages = Math.ceil(completeJobs.length / COMPLETE_PER_PAGE);
  const pagedComplete = completeJobs.slice(completePage * COMPLETE_PER_PAGE, (completePage + 1) * COMPLETE_PER_PAGE);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleCancel = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleRetry = (id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'running' as const, progress: 0, eta: '~8 min', errorReason: undefined } : j)));
  };

  const toggleExpandFailed = (id: string) => {
    setExpandedFailed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabs: { key: typeof activeTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: jobs.length },
    { key: 'running', label: 'Running', count: runningCount },
    { key: 'queued', label: 'Queued', count: queuedCount },
    { key: 'complete', label: 'Complete', count: completeCount },
    { key: 'failed', label: 'Failed', count: failedCount },
  ];

  const sortArrow = (col: typeof sortCol) => sortCol === col ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';

  return (
    <div style={{ padding: '20px 24px', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Header */}
      <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 4px' }}>Render Queue</h1>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>Monitor and manage your rendering jobs</p>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Today's Jobs" value={todayJobs} />
        <StatCard label="Complete" value={completeCount} accent="#6ee7b7" />
        <StatCard label="Failed" value={failedCount} accent={failedCount > 0 ? '#f87171' : undefined} />
        <StatCard label="Credits Used" value={creditsUsed} accent="var(--brand-light, #a78bfa)" />
        <StatCard label="Avg Time" value={avgTime} />
        <StatCard label="Success Rate" value={`${successRate}%`} accent="#6ee7b7" />
      </div>

      {/* Tab filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setCompletePage(0); }}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--brand-light, #a78bfa)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--brand, #7c3aed)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Running jobs */}
      {runningJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Running</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runningJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg-elevated, #13131f)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg, 10px)',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{job.projectName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{job.shotLabel}</span>
                    <TierBadge tier={job.tier} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>ETA {job.eta}</span>
                    <button
                      onClick={() => handleCancel(job.id)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--progress-track, rgba(255,255,255,0.07))', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${job.progress}%`,
                        borderRadius: 3,
                        background: 'var(--progress-fill, #7c3aed)',
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-light, #a78bfa)', minWidth: 40, textAlign: 'right' }}>
                    {job.progress.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queued jobs */}
      {queuedJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Queued</h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No jobs in queue</p>
        </div>
      )}

      {/* Complete jobs table */}
      {pagedComplete.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</h2>
          <div
            style={{
              background: 'var(--bg-elevated, #13131f)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg, 10px)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {([
                    ['project', 'Project'],
                    ['shot', 'Shot'],
                    ['duration', 'Duration'],
                    ['credits', 'Credits'],
                    ['completed', 'Completed'],
                  ] as [typeof sortCol, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      {label}{sortArrow(key)}
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {pagedComplete.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{job.projectName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{job.shotLabel}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{job.duration}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--brand-light, #a78bfa)' }}>{job.credits}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                      {job.completedAt ? new Date(job.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCompletePages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {Array.from({ length: totalCompletePages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCompletePage(i)}
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 12,
                    fontWeight: completePage === i ? 600 : 400,
                    background: completePage === i ? 'var(--brand, #7c3aed)' : 'transparent',
                    color: completePage === i ? '#fff' : 'var(--text-secondary)',
                    border: completePage === i ? 'none' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failed jobs */}
      {failedJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg-elevated, #13131f)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-lg, 10px)',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleExpandFailed(job.id)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status="failed" />
                    <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{job.projectName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{job.shotLabel}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRetry(job.id); }}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        background: 'transparent',
                        border: '1px solid var(--brand-border, rgba(124,58,237,0.35))',
                        borderRadius: 'var(--radius-sm, 6px)',
                        color: 'var(--brand-light, #a78bfa)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Retry
                    </button>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', transform: expandedFailed.has(job.id) ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                      &#9660;
                    </span>
                  </div>
                </div>
                {expandedFailed.has(job.id) && job.errorReason && (
                  <div
                    style={{
                      padding: '0 16px 14px',
                      fontSize: 12,
                      color: '#f87171',
                      lineHeight: 1.6,
                      borderTop: '1px solid rgba(239,68,68,0.15)',
                      paddingTop: 12,
                    }}
                  >
                    <strong>Error:</strong> {job.errorReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
          No jobs match the current filter.
        </div>
      )}
    </div>
  );
}
