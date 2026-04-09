'use client';

import Skeleton from './Skeleton';

export default function CharacterCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Avatar circle area */}
      <div
        style={{
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-overlay)',
        }}
      >
        <Skeleton width={48} height={48} borderRadius="50%" />
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Name */}
        <Skeleton width="55%" height={14} />
        {/* Tags row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Skeleton width={52} height={18} borderRadius={4} />
          <Skeleton width={40} height={18} borderRadius={4} />
        </div>
        {/* Drift bar */}
        <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}
