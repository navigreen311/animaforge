'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Film,
  XCircle,
  CheckCircle,
  MessageSquare,
  UserPlus,
  DollarSign,
  AlertTriangle,
  Package,
  ArrowRight,
  Bell,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType =
  | 'render_complete'
  | 'render_failed'
  | 'shot_approved'
  | 'comment'
  | 'member_joined'
  | 'marketplace_sale'
  | 'credits_low'
  | 'export_ready';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  createdAt: string;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'render_complete', title: 'Render complete', subtitle: 'Hero entrance shot — 1080p export', createdAt: '2026-04-09T09:45:00Z', read: false, actionLabel: 'View', actionHref: '/shots/s1' },
  { id: 'n2', type: 'comment', title: 'New comment', subtitle: 'Alex: "Love the lighting in scene 3"', createdAt: '2026-04-09T09:20:00Z', read: false, actionLabel: 'Reply', actionHref: '/shots/s1' },
  { id: 'n3', type: 'shot_approved', title: 'Shot approved', subtitle: 'Sunset fly-over was approved by Director', createdAt: '2026-04-09T08:00:00Z', read: false },
  { id: 'n4', type: 'member_joined', title: 'New team member', subtitle: 'Sarah joined Midnight Fable', createdAt: '2026-04-08T16:30:00Z', read: true },
  { id: 'n5', type: 'render_failed', title: 'Render failed', subtitle: 'Chase sequence — GPU timeout', createdAt: '2026-04-08T14:00:00Z', read: true, actionLabel: 'Retry', actionHref: '/renders' },
  { id: 'n6', type: 'marketplace_sale', title: 'Marketplace sale', subtitle: 'Magic particle FX purchased for $12', createdAt: '2026-04-08T10:00:00Z', read: true },
  { id: 'n7', type: 'credits_low', title: 'Credits running low', subtitle: 'Only 150 credits remaining', createdAt: '2026-04-07T09:00:00Z', read: true, actionLabel: 'Top up', actionHref: '/settings' },
  { id: 'n8', type: 'export_ready', title: 'Export ready', subtitle: 'Product Launch Ad — MP4 download', createdAt: '2026-04-06T15:00:00Z', read: true, actionLabel: 'Download', actionHref: '/exports' },
  { id: 'n9', type: 'render_complete', title: 'Render complete', subtitle: 'Close-up reaction — 4K export', createdAt: '2026-04-05T12:00:00Z', read: true },
  { id: 'n10', type: 'comment', title: 'New comment', subtitle: 'Mike: "Can we adjust the timing?"', createdAt: '2026-04-04T18:00:00Z', read: true },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_ICONS: Record<NotificationType, { icon: typeof Film; color: string }> = {
  render_complete: { icon: Film, color: 'var(--status-complete-text)' },
  render_failed: { icon: XCircle, color: '#f87171' },
  shot_approved: { icon: CheckCircle, color: 'var(--status-complete-text)' },
  comment: { icon: MessageSquare, color: '#60a5fa' },
  member_joined: { icon: UserPlus, color: '#a78bfa' },
  marketplace_sale: { icon: DollarSign, color: '#fbbf24' },
  credits_low: { icon: AlertTriangle, color: '#fbbf24' },
  export_ready: { icon: Package, color: '#34d399' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This week';
  return 'Older';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useMemo(() => {
    // Return mock data and a no-op setter for simplicity
    return [MOCK_NOTIFICATIONS, () => {}] as const;
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of notifications) {
      const group = getDateGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }
    return groups;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleMarkAllRead = () => {
    // Mock — in real app would call API
    fetch('/api/v1/notifications/mark-all-read', { method: 'POST' }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.3)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 380,
              zIndex: 9999,
              background: 'var(--bg-elevated)',
              borderLeft: '0.5px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="var(--text-primary)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'var(--brand)',
                      borderRadius: 99,
                      padding: '1px 7px',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-brand)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {['Today', 'Yesterday', 'This week', 'Older'].map((group) => {
                if (!grouped[group]) return null;
                return (
                  <div key={group}>
                    <div
                      style={{
                        padding: '8px 18px 4px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {group}
                    </div>
                    {grouped[group].map((n) => {
                      const typeMeta = TYPE_ICONS[n.type];
                      const Icon = typeMeta.icon;
                      return (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex',
                            gap: 10,
                            padding: '10px 18px',
                            background: n.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)',
                            transition: 'background 100ms',
                            cursor: 'default',
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: 'var(--bg-overlay)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            <Icon size={14} color={typeMeta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {n.title}
                              {!n.read && (
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: 'var(--brand)',
                                    display: 'inline-block',
                                    marginLeft: 6,
                                    verticalAlign: 'middle',
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.subtitle}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{timeAgo(n.createdAt)}</span>
                              {n.actionLabel && n.actionHref && (
                                <a
                                  href={n.actionHref}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: 'var(--text-brand)',
                                    textDecoration: 'none',
                                  }}
                                >
                                  {n.actionLabel}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <a
              href="/notifications"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '14px 0',
                fontSize: 12,
                color: 'var(--text-brand)',
                textDecoration: 'none',
                borderTop: '0.5px solid var(--border)',
              }}
            >
              View all <ArrowRight size={12} />
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
