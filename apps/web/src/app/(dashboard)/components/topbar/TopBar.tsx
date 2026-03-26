'use client';

import { Bell } from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import GlobalSearch from './GlobalSearch';
import RenderQueueBadge from './RenderQueueBadge';

export default function TopBar() {
  return (
    <header
      className="flex flex-row items-center px-4 gap-3"
      style={{
        height: 'var(--topbar-height, 52px)',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Left: Workspace Switcher */}
      <WorkspaceSwitcher />

      {/* Center: Global Search */}
      <div className="flex-1" style={{ maxWidth: 340 }}>
        <GlobalSearch />
      </div>

      {/* Right: Actions */}
      <div className="ml-auto flex items-center" style={{ gap: 10 }}>
        <RenderQueueBadge activeJobCount={0} />

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications — 3 unread"
          className="relative flex items-center justify-center rounded"
          style={{
            width: 32,
            height: 32,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
          <span
            aria-hidden="true"
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: 0,
              right: 0,
              width: 8,
              height: 8,
              backgroundColor: '#ef4444',
              fontSize: 7,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            3
          </span>
        </button>

        {/* User Avatar */}
        <button
          type="button"
          aria-label="User menu"
          className="flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'var(--brand)',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 600,
          }}
          onClick={() => {
            // TODO: open user dropdown
          }}
        >
          SH
        </button>
      </div>
    </header>
  );
}
