'use client';

import { useCallback } from 'react';
import type { CollabUser } from '@/hooks/useCollab';

interface CollabBarProps {
  users: CollabUser[];
  isConnected: boolean;
  projectId?: string;
}

export default function CollabBar({ users, isConnected, projectId }: CollabBarProps) {
  const connectionColor = isConnected
    ? 'bg-green-500 animate-pulse'
    : users.length > 0 ? 'bg-yellow-500' : 'bg-red-500';

  const connectionLabel = isConnected ? 'Connected' : users.length > 0 ? 'Reconnecting...' : 'Disconnected';

  const handleShare = useCallback(() => {
    if (!projectId) return;
    const inviteUrl = `${window.location.origin}/project/${projectId}/join`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      console.log('[collab] Invite link copied to clipboard');
    });
  }, [projectId]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${connectionColor}`} />
        <span className="text-[10px] text-gray-500">{connectionLabel}</span>
      </div>
      <div className="w-px h-4 bg-gray-700" />
      <div className="flex -space-x-1.5">
        {users.map((user) => (
          <div
            key={user.userId}
            title={`${user.displayName}${user.selectedShot ? ` \u2014 editing shot ${user.selectedShot}` : ''}`}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-gray-900 relative"
            style={{ backgroundColor: user.color }}
          >
            {user.displayName.charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 ring-1 ring-gray-900" />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-gray-500">{users.length} online</span>
      <button type="button" onClick={handleShare}
        className="ml-auto rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-[10px] font-medium text-gray-300 hover:border-violet-600/50 hover:text-violet-400 transition-colors">
        Share
      </button>
    </div>
  );
}
