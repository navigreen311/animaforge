'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useResource, mutate } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
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

const FILTER_TABS: {
  id: FilterTab;
  label: string;
  icon: typeof Bell;
  types: NotificationType[];
}[] = [
  { id: 'all', label: 'All', icon: Bell, types: [] },
  {
    id: 'renders',
    label: 'Renders',
    icon: Film,
    types: ['render_complete', 'render_failed', 'export_ready'],
  },
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
/*  Live data                                                          */
/* ------------------------------------------------------------------ */

/** One row of GET /api/users/me/notifications. */
interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationFeed {
  items: NotificationRow[];
  unread: number;
}

/**
 * The Notification table stores a free-text `type`; this screen groups by a
 * fixed set. An unrecognised type falls into "system" rather than being
 * dropped, so a new event type is still visible.
 */
const KNOWN_TYPES = new Set<string>([
  'render_complete',
  'render_failed',
  'shot_approved',
  'comment',
  'member_joined',
  'marketplace_sale',
  'credits_low',
  'export_ready',
]);

function toNotification(row: NotificationRow): Notification {
  const type = (KNOWN_TYPES.has(row.type) ? row.type : 'credits_low') as NotificationType;
  return {
    id: row.id,
    type,
    title: row.title,
    subtitle: row.body ?? '',
    createdAt: row.createdAt,
    read: row.isRead,
    actionHref: row.actionUrl ?? undefined,
    actionLabel: row.actionUrl ? 'Open' : undefined,
  };
}

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
  const state = useResource<NotificationFeed>('/api/users/me/notifications');
  const allNotifications = useMemo(
    () => (state.data?.items ?? []).map(toNotification),
    [state.data],
  );

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

  // Both used to update local state first and fire a request at
  // /api/v1/notifications/* — a path that does not exist — swallowing the
  // failure, so the list looked cleared until the next load.
  const handleMarkAllRead = async () => {
    const { error } = await mutate('/api/users/me/notifications', 'PATCH', { isRead: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    state.reload();
  };

  const handleClearAll = async () => {
    // Marking every notification read is the only bulk operation the API
    // offers. There is no delete endpoint, so this no longer claims to clear.
    await handleMarkAllRead();
  };

  if (state.loading && state.data === null) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingState label="Loading notifications…" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: 24 }}>
        <ErrorState error={state.error} onRetry={state.reload} />
      </div>
    );
  }

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
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
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
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = n.read
                            ? 'transparent'
                            : 'rgba(124, 58, 237, 0.04)';
                        }}
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
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                              }}
                            >
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
                          <div
                            style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}
                          >
                            {n.subtitle}
                          </div>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}
                          >
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {timeAgo(n.createdAt)}
                            </span>
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
                  border:
                    page === i + 1 ? '1px solid var(--brand-border)' : '0.5px solid var(--border)',
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
