'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Settings2,
  Copy,
  Scissors,
  MessageSquare,
  Layers,
  CheckCircle,
  XCircle,
  Timer,
  Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ShotContextMenuProps {
  x: number;
  y: number;
  shotName: string;
  shotStatus: string;
  onClose: () => void;
  onAction: (action: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Menu item definition                                               */
/* ------------------------------------------------------------------ */

interface MenuItem {
  type: 'item';
  label: string;
  action: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'danger';
  /** When provided, the item is only rendered if this returns true. */
  visible?: (status: string) => boolean;
}

interface MenuSeparator {
  type: 'separator';
}

type MenuEntry = MenuItem | MenuSeparator;

const MENU_ENTRIES: MenuEntry[] = [
  { type: 'item', label: 'Generate', action: 'generate', icon: Zap },
  {
    type: 'item',
    label: 'Regenerate',
    action: 'regenerate',
    icon: RefreshCw,
    visible: (status) => status !== 'draft',
  },
  { type: 'separator' },
  { type: 'item', label: 'Edit Properties', action: 'edit-properties', icon: Settings2 },
  { type: 'item', label: 'Duplicate Shot', action: 'duplicate', icon: Copy },
  { type: 'item', label: 'Split Here', action: 'split', icon: Scissors },
  { type: 'separator' },
  { type: 'item', label: 'Add Comment', action: 'add-comment', icon: MessageSquare },
  { type: 'item', label: 'View All Takes', action: 'view-takes', icon: Layers },
  { type: 'separator' },
  {
    type: 'item',
    label: 'Approve Shot',
    action: 'approve',
    icon: CheckCircle,
    variant: 'success',
  },
  { type: 'item', label: 'Reject Shot', action: 'reject', icon: XCircle },
  { type: 'separator' },
  { type: 'item', label: 'Copy Timecode', action: 'copy-timecode', icon: Timer },
  { type: 'item', label: 'Delete Shot', action: 'delete', icon: Trash2, variant: 'danger' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShotContextMenu({
  x,
  y,
  shotName,
  shotStatus,
  onClose,
  onAction,
}: ShotContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  /* Close on Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOutsideClick, handleKeyDown]);

  const handleItemClick = (action: string) => {
    onAction(action);
    onClose();
  };

  /* Filter entries based on shot status */
  const visibleEntries = MENU_ENTRIES.filter((entry) => {
    if (entry.type === 'separator') return true;
    return entry.visible ? entry.visible(shotStatus) : true;
  });

  /* Collapse consecutive / leading / trailing separators */
  const cleanedEntries = visibleEntries.filter((entry, i, arr) => {
    if (entry.type !== 'separator') return true;
    if (i === 0 || i === arr.length - 1) return false;
    return arr[i - 1].type !== 'separator';
  });

  return (
    <div ref={menuRef} style={{ ...styles.overlay, left: x, top: y }} role="menu">
      {/* Header */}
      <div style={styles.header}>{shotName}</div>

      {/* Menu entries */}
      {cleanedEntries.map((entry, idx) => {
        if (entry.type === 'separator') {
          return <div key={`sep-${idx}`} style={styles.separator} role="separator" />;
        }

        const Icon = entry.icon;
        const isDanger = entry.variant === 'danger';
        const isSuccess = entry.variant === 'success';

        return (
          <button
            key={entry.action}
            role="menuitem"
            style={{
              ...styles.item,
              ...(isSuccess ? styles.itemSuccess : {}),
              ...(isDanger ? styles.itemDanger : {}),
            }}
            onClick={() => handleItemClick(entry.action)}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = 'var(--bg-hover)';
              if (isDanger) el.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = 'transparent';
              if (isDanger) el.style.color = '#ef4444';
              else if (isSuccess) el.style.color = '#22c55e';
              else el.style.color = 'var(--text-primary)';
            }}
          >
            <Icon size={14} style={styles.icon} />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles (CSS-variable-aware)                                 */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    zIndex: 1000,
    minWidth: 200,
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
    padding: '4px 0',
    /* fade-in + scale animation */
    animation: 'ctxFadeIn 100ms ease-out forwards',
    transformOrigin: 'top left',
  },

  header: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '6px 12px 4px',
    userSelect: 'none',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  separator: {
    height: 1,
    margin: '4px 8px',
    background: 'var(--border-strong)',
    opacity: 0.5,
  },

  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 'calc(100% - 8px)',
    fontSize: 11,
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    lineHeight: 1.4,
    margin: '0 4px',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  itemSuccess: {
    color: '#22c55e',
  },

  itemDanger: {
    color: '#ef4444',
  },

  icon: {
    flexShrink: 0,
  },
};

/* ------------------------------------------------------------------ */
/*  Global keyframe injection (once)                                   */
/* ------------------------------------------------------------------ */

if (typeof document !== 'undefined') {
  const STYLE_ID = 'shot-ctx-menu-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes ctxFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}
