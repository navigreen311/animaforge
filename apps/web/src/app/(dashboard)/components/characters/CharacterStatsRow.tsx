'use client';

import type { CharacterStats } from '@/lib/types';

interface CharacterStatsRowProps {
  stats: CharacterStats | null;
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

export default function CharacterStatsRow({ stats, loading }: CharacterStatsRowProps) {
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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}
    >
      {/* Total characters */}
      <div style={cardStyle}>
        <p style={labelStyle}>Total characters</p>
        <p style={valueStyle}>{stats.total}</p>
        <p style={subStyle}>in your library</p>
      </div>

      {/* Active in projects */}
      <div style={cardStyle}>
        <p style={labelStyle}>Active in projects</p>
        <p style={valueStyle}>{stats.activeInProjects}</p>
        <p style={subStyle}>currently assigned</p>
      </div>

      {/* Digital twins */}
      <div style={cardStyle}>
        <p style={labelStyle}>Digital twins</p>
        <p style={valueStyle}>{stats.digitalTwins}</p>
        <p style={subStyle}>likeness-based</p>
      </div>

      {/* Voices paired */}
      <div style={cardStyle}>
        <p style={labelStyle}>Voices paired</p>
        <p style={valueStyle}>{stats.voicesPaired}</p>
        <p style={subStyle}>voice models linked</p>
      </div>
    </div>
  );
}
