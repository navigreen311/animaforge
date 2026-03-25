'use client';

import { useEffect, useState } from 'react';
import type { ShotLockInfo } from '@/hooks/useCollab';

interface ShotLockIndicatorProps {
  lockInfo: ShotLockInfo | undefined;
  currentUserId: string;
  lockedByName?: string;
  onRequestUnlock?: () => void;
}

export default function ShotLockIndicator({
  lockInfo, currentUserId, lockedByName, onRequestUnlock,
}: ShotLockIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!lockInfo?.locked || !lockInfo.expiresAt) { setTimeRemaining(0); return; }
    const update = () => {
      const remaining = Math.max(0, lockInfo.expiresAt! - Date.now());
      setTimeRemaining(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockInfo?.locked, lockInfo?.expiresAt]);

  if (!lockInfo?.locked || lockInfo.lockedBy === currentUserId) return null;
  const secondsLeft = Math.ceil(timeRemaining / 1000);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-lg bg-black/50 backdrop-blur-[2px]">
      <svg className="w-6 h-6 text-amber-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className="text-[10px] font-medium text-amber-300">
        {lockedByName || 'Another user'} is editing
      </span>
      {secondsLeft > 0 && (
        <span className="text-[9px] text-gray-400 mt-0.5">Expires in {secondsLeft}s</span>
      )}
      {onRequestUnlock && (
        <button type="button" onClick={onRequestUnlock}
          className="mt-2 rounded border border-amber-600/50 bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:bg-amber-900/50 hover:border-amber-500/50 transition-colors">
          Request Unlock
        </button>
      )}
    </div>
  );
}
