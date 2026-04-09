'use client';

import Skeleton from './Skeleton';

export default function ShotBlockSkeleton() {
  return (
    <Skeleton
      width="100%"
      height={56}
      borderRadius={8}
      style={{ minWidth: 100 }}
    />
  );
}
