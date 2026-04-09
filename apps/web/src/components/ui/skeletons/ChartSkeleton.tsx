'use client';

import Skeleton from './Skeleton';

export default function ChartSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Chart title area */}
      <Skeleton width={140} height={14} />
      {/* Chart rectangle */}
      <Skeleton width="100%" height={220} borderRadius={8} />
    </div>
  );
}
