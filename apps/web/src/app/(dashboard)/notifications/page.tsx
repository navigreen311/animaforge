'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  Film,
  XCircle,
  CheckCircle,
  MessageSquare,
  UserPlus,
  DollarSign,
  AlertTriangle,
  Package,
  CheckCheck,
  Trash2,
  Users,
  Store,
  Settings,
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

type FilterTab = 'all' | 'renders' | 'team' | 'marketplace' | 'system';

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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FILTER_TABS: { id: FilterTab; label: string; icon: typeof Bell; types: NotificationType[] }[] = [
  { id: 'all', label: 'All', icon: Bell, types: [] },
  { id: 'renders', label: 'Renders', icon: Film, types: ['render_complete', 'render_failed', 'export_ready'] },
  { id: 'team', label: 'Team', icon: Users, types: ['shot_approved', 'comment', 'member_joined'] },
  { id: 'marketplace', label: 'Marketplace', icon: Store, types: ['marketplace_sale'] },
  { id: 'system', label: 'System', icon: Settings, types: ['credits_low'] },
];

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

const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'render_complete', title: 'Render complete', subtitle: 'Hero entrance shot — 1080p export ready for download', createdAt: '2026-04-09T09:45:00Z', read: false, actionLabel: 'View', actionHref: '/shots/s1' },
  { id: 'n2', type: 'comment', title: 'New comment on Scene 3', subtitle: 'Alex: "Love the lighting here, can we keep this direction?"', createdAt: '2026-04-09T09:20:00Z', read: false, actionLabel: 'Reply', actionHref: '/shots/s1' },
  { id: 'n3', type: 'shot_approved', title: 'Shot approved', subtitle: 'Sunset fly-over establishing shot was approved by Director', createdAt: '2026-04-09T08:00:00Z', read: false },
  { id: 'n4', type: 'member_joined', title: 'New team member', subtitle: 'Sarah Chen joined project Midnight Fable as Animator', createdAt: '2026-04-08T16:30:00Z', read: true },
  { id: 'n5', type: 'render_failed', title: 'Render failed', subtitle: 'Chase sequence rooftop — GPU timeout after 12 minutes', createdAt: '2026-04-08T14:00:00Z', read: true, actionLabel: 'Retry', actionHref: '/renders' },
  { id: 'n6', type: 'marketplace_sale', title: 'Marketplace sale', subtitle: 'Magic particle FX pack purchased for $12.00', createdAt: '2026-04-08T10:00:00Z', read: true },
  { id: 'n7', type: 'credits_low', title: 'Credits running low', subtitle: 'You have 150 credits remaining. Top up to avoid interruptions.', createdAt: '2026-04-07T09:00:00Z', read: true, actionLabel: 'Top up', actionHref: '/settings' },
  { id: 'n8', type: 'export_ready', title: 'Export ready', subtitle: 'Product Launch Ad — MP4 1080p download ready', createdAt: '2026-04-06T15:00:00Z', read: true, actionLabel: 'Download', actionHref: '/exports' },
  { id: 'n9', type: 'render_complete', title: 'Render complete', subtitle: 'Close-up reaction shot — 4K export', createdAt: '2026-04-05T12:00:00Z', read: true },
  { id: 'n10', type: 'comment', title: 'New comment on Timeline', subtitle: 'Mike: "Can we adjust the timing on the transition?"', createdAt: '2026-04-04T18:00:00Z', read: true },
  { id: 'n11', type: 'shot_approved', title: 'Shot approved', subtitle: 'Forest background pan approved by Art Director', createdAt: '2026-04-03T11:00:00Z', read: true },
  { id: 'n12', type: 'render_complete', title: 'Render complete', subtitle: 'Opening sequence — batch render finished', createdAt: '2026-04-02T16:00:00Z', read: true },
  { id: 'n13', type: 'marketplace_sale', title: 'Marketplace sale', subtitle: 'Anime character template sold for $8.00', createdAt: '2026-04-01T10:00:00Z', read: true },
  { id: 'n14', type: 'member_joined', title: 'New team member', subtitle: 'Jordan Lee joined project Product Launch Ad', createdAt: '2026-03-30T14:00:00Z', read: true },
  { id: 'n15', type: 'export_ready', title: 'Export ready', subtitle: 'Explainer video — WebM format', createdAt: '2026-03-28T09:00:00Z', read: true, actionLabel: 'Download', actionHref: '/exports' },
  { id: 'n16', type: 'credits_low', title: 'Credits depleted', subtitle: 'All credits used. Renders are paused.', createdAt: '2026-03-25T08:00:00Z', read: true, actionLabel: 'Top up', actionHref: '/settings' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [allNotifications, setAllNotifications] = useState(MOCK_NOTIFICATIONS);

  // Filter
  const filtered = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.id === activeTab)!;
    if (tab.types.length === 0) return allNotifications;
    return allNotifications.filter((n) => tab.types.includes(n.type));
  }, [allNotifications, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Group paginated results by date
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of paginated) {
      const group = getDateGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }
    return groups;
  }, [paginated]);

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch('/api/v1/notifications/mark-all-read', { method: 'POST' }).catch(() => {});
  };

  const handleClearAll = () => {
    setAllNotifications([]);
    fetch('/api/v1/notifications/clear', { method: 'POST' }).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />
            Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--brand)',
                  borderRadius: 99,
                  padding: '2px 8px',
                }}
              >
                {unreadCount} new
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            Stay updated on renders, team activity, and more
          </p>
        </div>

        {/* Bulk actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={13} />
            Clear all
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          padding: '16px 24px 0',
          display: 'flex',
          gap: 4,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                color: isActive ? 'var(--text-brand)' : 'var(--text-secondary)',
                padding: '8px 14px 10px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 120ms',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Bell size={32} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              No notifications
            </p>
          </div>
        ) : (
          ['Today', 'Yesterday', 'This week', 'Older'].map((group) => {
            if (!grouped[group]) return null;
            return (
              <div key={group} style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  {group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {grouped[group].map((n) => {
                    const typeMeta = TYPE_ICONS[n.type];
                    const Icon = typeMeta.icon;
                    return (
                      <div
                        key={n.id}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: n.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)'; }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'var(--bg-overlay)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          <Icon size={15} color={typeMeta.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {n.title}
                            </span>
                            {!n.read && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: 'var(--brand)',
                                  display: 'inline-block',
                                }}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {n.subtitle}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(n.createdAt)}</span>
                            {n.actionLabel && n.actionHref && (
                              <a
                                href={n.actionHref}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: 'var(--text-brand)',
                                  textDecoration: 'none',
                                  background: 'var(--brand-dim)',
                                  padding: '3px 10px',
                                  borderRadius: 'var(--radius-sm)',
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
              </div>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              marginTop: 24,
            }}
          >
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  border: page === i + 1 ? '1px solid var(--brand-border)' : '0.5px solid var(--border)',
                  background: page === i + 1 ? 'var(--bg-active)' : 'var(--bg-elevated)',
                  color: page === i + 1 ? 'var(--text-brand)' : 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: page === i + 1 ? 600 : 400,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
