'use client';

import React from 'react';

/**
 * Hidden skip-navigation link that becomes visible on keyboard focus.
 * Jumps the user straight to #main-content.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        fixed left-4 top-4 z-[9999]
        -translate-y-full rounded bg-white px-4 py-2
        text-sm font-semibold text-black shadow-lg
        transition-transform duration-150
        focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500
      "
    >
      Skip to main content
    </a>
  );
}
