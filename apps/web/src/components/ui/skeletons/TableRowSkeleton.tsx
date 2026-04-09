'use client';

import Skeleton from './Skeleton';

interface TableRowSkeletonProps {
  columns?: number;
}

export default function TableRowSkeleton({ columns = 5 }: TableRowSkeletonProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === 0 ? '80%' : '60%'}
          height={12}
        />
      ))}
    </div>
  );
}
