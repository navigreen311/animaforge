'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const TIER_LABELS: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-gray-700 text-gray-300' },
  pro: { label: 'Pro', className: 'bg-violet-600 text-white' },
  enterprise: { label: 'Enterprise', className: 'bg-amber-600 text-white' },
};

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = getInitials(user.displayName);
  const tierInfo = TIER_LABELS[user.tier] ?? TIER_LABELS.free;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-medium text-gray-200 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span
              className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${tierInfo.className}`}
            >
              {tierInfo.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
