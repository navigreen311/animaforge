'use client';

import React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  /** Render as a different element (default: span). */
  as?: React.ElementType;
}

/**
 * Screen-reader-only text wrapper. Visually hidden but accessible.
 */
export default function VisuallyHidden({
  children,
  as: Tag = 'span',
}: VisuallyHiddenProps) {
  return (
    <Tag
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Tag>
  );
}
