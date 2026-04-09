'use client';

import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
  className?: string;
}

export default function Skeleton({
  width,
  height,
  borderRadius = 6,
  style,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        background: 'var(--bg-overlay)',
        borderRadius,
        width,
        height,
        ...style,
      }}
    />
  );
}
