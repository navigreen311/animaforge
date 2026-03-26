'use client';

import type { DashboardStats } from '@/lib/types';
import { formatCredits, getProgressPercent } from '@/lib/utils/format';

interface StatsRowProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse"
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          height: 12,
          width: 64,
          borderRadius: 4,
          background: 'var(--bg-overlay)',
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 24,
          width: 48,
          borderRadius: 4,
          background: 'var(--bg-overlay)',
          marginBottom: 6,
        }}
      />
      <div
        style={{
          height: 12,
          width: 80,
          borderRadius: 4,
          background: 'var(--bg-overlay)',
        }}
      />
    </div>
  );
}

export default function StatsRow({ stats, loading }: StatsRowProps) {
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!stats) return null;

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 14px',
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

  const remaining = formatCredits(stats.creditsTotal - stats.creditsUsed);
  const progressPercent = getProgressPercent(stats.approvedShots, stats.totalShots);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}
    >
      {/* Total shots */}
      <div style={cardStyle}>
        <p style={labelStyle}>Total shots</p>
        <p style={valueStyle}>{stats.totalShots}</p>
        <p style={subStyle}>across {stats.totalProjects} projects</p>
      </div>

      {/* Approved */}
      <div style={cardStyle}>
        <p style={labelStyle}>Approved</p>
        <p style={valueStyle}>{stats.approvedShots}</p>
        <p style={subStyle}>{progressPercent}% complete</p>
      </div>

      {/* Credits used */}
      <div style={cardStyle}>
        <p style={labelStyle}>Credits used</p>
        <p style={valueStyle}>{formatCredits(stats.creditsUsed)}</p>
        <p style={subStyle}>{remaining} remaining</p>
      </div>

      {/* Render queue */}
      <div style={cardStyle}>
        <p style={labelStyle}>Render queue</p>
        <p
          style={{
            ...valueStyle,
            color:
              stats.activeRenderJobs > 0
                ? 'var(--status-generating-text)'
                : 'var(--text-primary)',
          }}
        >
          {stats.activeRenderJobs}
        </p>
        <p style={subStyle}>active jobs</p>
      </div>
    </div>
  );
}
