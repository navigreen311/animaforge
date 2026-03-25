'use client';

import { useEffect, useState } from 'react';
import type { CollabUser } from '@/hooks/useCollab';

interface CollabCursorProps {
  user: CollabUser;
}

export default function CollabCursor({ user }: CollabCursorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(user.cursor !== null);
  }, [user.cursor]);

  if (!visible || !user.cursor) return null;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: user.cursor.x,
        top: user.cursor.y,
        transition: 'left 120ms ease-out, top 120ms ease-out, opacity 200ms',
        opacity: visible ? 1 : 0,
      }}
    >
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M1 1L6.5 14L8.5 8.5L14 6.5L1 1Z" fill={user.color} stroke={user.color} strokeWidth={1} strokeLinejoin="round" />
      </svg>
      <div className="ml-3 -mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap shadow-lg" style={{ backgroundColor: user.color }}>
        {user.displayName}
      </div>
    </div>
  );
}
