'use client';

import Skeleton from './Skeleton';

export default function ProjectCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail area */}
      <Skeleton width="100%" height={140} borderRadius={0} />

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <Skeleton width="65%" height={14} />
        {/* Subtitle */}
        <Skeleton width="40%" height={10} />
        {/* Progress bar */}
        <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}
