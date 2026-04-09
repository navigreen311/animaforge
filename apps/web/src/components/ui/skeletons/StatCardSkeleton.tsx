'use client';

import Skeleton from './Skeleton';

export default function StatCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Number */}
      <Skeleton width={80} height={24} />
      {/* Label */}
      <Skeleton width={100} height={10} />
    </div>
  );
}
