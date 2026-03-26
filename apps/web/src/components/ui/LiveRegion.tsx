'use client';

import React, { useEffect, useRef } from 'react';

interface LiveRegionProps {
  /** The message to announce. Change this value to trigger a new announcement. */
  message: string;
  /** aria-live politeness setting. Defaults to "polite". */
  politeness?: 'polite' | 'assertive';
}

/**
 * Renders an invisible aria-live region that announces dynamic content
 * changes to screen readers.
 */
export default function LiveRegion({
  message,
  politeness = 'polite',
}: LiveRegionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear then set to force re-announcement
    if (ref.current) {
      ref.current.textContent = '';
      requestAnimationFrame(() => {
        if (ref.current) ref.current.textContent = message;
      });
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
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
    />
  );
}
