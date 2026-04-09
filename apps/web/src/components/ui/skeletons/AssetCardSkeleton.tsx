'use client';

import Skeleton from './Skeleton';

export default function AssetCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail */}
      <Skeleton width="100%" height={120} borderRadius={0} />

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Filename */}
        <Skeleton width="70%" height={12} />
        {/* File size */}
        <Skeleton width="30%" height={10} />
      </div>
    </div>
  );
}
