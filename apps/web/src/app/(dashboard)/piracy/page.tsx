'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  AlertTriangle,
  FileText,
  ExternalLink,
  Eye,
  Ban,
  Check,
  X,
  Plus,
  Settings,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabId = 'all' | 'investigating' | 'filed' | 'resolved' | 'settings';
type MatchStatus = 'new' | 'investigating' | 'filed' | 'resolved' | 'authorized' | 'dismissed';
type Platform = 'YouTube' | 'TikTok' | 'Reddit' | 'Twitter';
type ScannerStatus = 'active' | 'rate_limited' | 'paused';

interface PiracyMatch {
  id: string;
  originalOutput: string;
  originalShot: string;
  platform: Platform;
  matchUrl: string;
  matchStrength: number; // 0..100
  firstSeen: string;
  watermarkDetected: boolean;
  status: MatchStatus;
  gradient: string;
}

interface Scanner {
  id: string;
  platform: Platform;
  status: ScannerStatus;
  lastScan: string;
  retryIn?: string;
}

interface ActivityEntry {
  id: string;
  icon: typeof Shield;
  iconColor: string;
  text: string;
  time: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_MATCHES: PiracyMatch[] = [
  {
    id: 'm1',
    originalOutput: 'Cyberpunk Samurai — Shot 12',
    originalShot: 'af_001',
    platform: 'YouTube',
    matchUrl: 'youtube.com/watch?v=xK8f2JqLm9n',
    matchStrength: 92,
    firstSeen: '2 hours ago',
    watermarkDetected: true,
    status: 'new',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  },
  {
    id: 'm2',
    originalOutput: 'Neon Tokyo — Chase Sequence',
    originalShot: 'af_002',
    platform: 'TikTok',
    matchUrl: 'tiktok.com/@user123/video/7284920193842',
    matchStrength: 87,
    firstSeen: '5 hours ago',
    watermarkDetected: true,
    status: 'investigating',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  },
  {
    id: 'm3',
    originalOutput: 'Midnight Fable — Opening',
    originalShot: 'af_003',
    platform: 'Reddit',
    matchUrl: 'reddit.com/r/animation/comments/1b3k7d2',
    matchStrength: 78,
    firstSeen: '8 hours ago',
    watermarkDetected: false,
    status: 'new',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  },
  {
    id: 'm4',
    originalOutput: 'Dragon Rider — Flight Scene',
    originalShot: 'af_004',
    platform: 'Twitter',
    matchUrl: 'twitter.com/animeclips/status/1762839201847',
    matchStrength: 95,
    firstSeen: '1 day ago',
    watermarkDetected: true,
    status: 'filed',
    gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  },
  {
    id: 'm5',
    originalOutput: 'Sunset Fly-over — Establishing',
    originalShot: 'af_005',
    platform: 'YouTube',
    matchUrl: 'youtube.com/shorts/Qj9mKp3vLw2',
    matchStrength: 84,
    firstSeen: '1 day ago',
    watermarkDetected: true,
    status: 'investigating',
    gradient: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
  },
  {
    id: 'm6',
    originalOutput: 'Forest Spirit — Reveal',
    originalShot: 'af_006',
    platform: 'TikTok',
    matchUrl: 'tiktok.com/@aifilms/video/7293847102938',
    matchStrength: 81,
    firstSeen: '2 days ago',
    watermarkDetected: false,
    status: 'resolved',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
  },
];

const MOCK_SCANNERS: Scanner[] = [
  { id: 's1', platform: 'YouTube', status: 'active', lastScan: '5m ago' },
  { id: 's2', platform: 'TikTok', status: 'active', lastScan: '12m ago' },
  { id: 's3', platform: 'Reddit', status: 'rate_limited', lastScan: '45m ago', retryIn: '8m' },
];

const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: 'a1', icon: AlertTriangle, iconColor: '#fbbf24', text: 'Match found on youtube.com/watch?v=xK8f2JqLm9n', time: '5m ago' },
  { id: 'a2', icon: FileText, iconColor: '#f87171', text: 'DMCA filed for match #1247', time: '15m ago' },
  { id: 'a3', icon: ShieldCheck, iconColor: '#34d399', text: 'Watermark verified for output af_001', time: '1h ago' },
  { id: 'a4', icon: Search, iconColor: '#a78bfa', text: 'Scan completed for TikTok (0 new matches)', time: '2h ago' },
  { id: 'a5', icon: AlertTriangle, iconColor: '#fbbf24', text: 'Match found on tiktok.com/@user123/video/7284920193842', time: '2h ago' },
  { id: 'a6', icon: Check, iconColor: '#34d399', text: 'Match #1243 marked as authorized by creator', time: '3h ago' },
  { id: 'a7', icon: ShieldAlert, iconColor: '#f87171', text: 'Reddit scanner rate limited — retrying in 8m', time: '4h ago' },
  { id: 'a8', icon: FileText, iconColor: '#f87171', text: 'DMCA filed for match #1241 on Twitter', time: '6h ago' },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All matches' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'filed', label: 'Filed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'settings', label: 'Settings' },
];

const SCAN_FREQUENCIES = ['Every 5 minutes', 'Every 15 minutes', 'Every hour', 'Every 6 hours', 'Daily'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PiracyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [threshold, setThreshold] = useState(75);
  const [scanFrequency, setScanFrequency] = useState(SCAN_FREQUENCIES[1]);

  const filteredMatches = useMemo(() => {
    if (activeTab === 'all') return MOCK_MATCHES;
    if (activeTab === 'investigating') return MOCK_MATCHES.filter((m) => m.status === 'investigating');
    if (activeTab === 'filed') return MOCK_MATCHES.filter((m) => m.status === 'filed');
    if (activeTab === 'resolved') return MOCK_MATCHES.filter((m) => m.status === 'resolved');
    return [];
  }, [activeTab]);

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
            <Shield size={18} />
            Content Protection
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 500,
                color: '#34d399',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '0.5px solid rgba(52, 211, 153, 0.3)',
                padding: '3px 9px',
                borderRadius: 99,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#34d399',
                  display: 'inline-block',
                }}
              />
              Monitoring active
            </span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            Watermark verification, piracy detection, and DMCA management
          </p>
        </div>

        <button
          type="button"
          style={{
            background: 'var(--brand)',
            border: 'none',
            color: '#fff',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Settings size={13} />
          Configure scanning
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          padding: '20px 24px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <StatCard icon={Shield} color="#60a5fa" label="Watermarked Outputs" value="1,247" />
        <StatCard icon={Search} color="#a78bfa" label="Active Scans" value="23" />
        <StatCard icon={AlertTriangle} color="#fbbf24" label="Matches Found" value="8" />
        <StatCard icon={FileText} color="#f87171" label="DMCA Filed" value="3" />
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: '20px 24px 0',
          display: 'flex',
          gap: 4,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                color: isActive ? 'var(--text-brand)' : 'var(--text-secondary)',
                padding: '8px 14px 10px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left column — matches + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* Matches list */}
          {activeTab === 'settings' ? (
            <SettingsPanel />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredMatches.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                filteredMatches.map((match) => <MatchCard key={match.id} match={match} />)
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Recent Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {MOCK_ACTIVITY.map((entry) => {
                const Icon = entry.icon;
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'var(--bg-overlay)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={12} color={entry.iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.text}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {entry.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar — Active Scanners */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}>
          <div
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Active Scanners
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOCK_SCANNERS.map((scanner) => (
                <ScannerCard key={scanner.id} scanner={scanner} />
              ))}
            </div>

            <button
              type="button"
              style={{
                marginTop: 10,
                width: '100%',
                background: 'transparent',
                border: '0.5px dashed var(--border)',
                color: 'var(--text-secondary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={13} />
              Add platform
            </button>
          </div>

          {/* Scan frequency + threshold */}
          <div
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Scan frequency
              </label>
              <select
                value={scanFrequency}
                onChange={(e) => setScanFrequency(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {SCAN_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span>Match threshold</span>
                <span style={{ color: 'var(--text-brand)' }}>{threshold}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--brand)',
                  cursor: 'pointer',
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 4,
                }}
              >
                Minimum similarity to trigger a match
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Shield;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: `${color}1a`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: PiracyMatch }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        padding: 14,
        display: 'flex',
        gap: 14,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 110,
          height: 72,
          borderRadius: 'var(--radius-md)',
          background: match.gradient,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            fontSize: 9,
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: 3,
            fontWeight: 500,
          }}
        >
          {match.originalShot}
        </div>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {match.originalOutput}
          </div>
          <StatusPill status={match.status} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            color: 'var(--text-tertiary)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            Detected on <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{match.platform}</span>
          </span>
          <span>•</span>
          <a
            href={`https://${match.matchUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {match.matchUrl}
            <ExternalLink size={10} />
          </a>
          <span>•</span>
          <span>First seen {match.firstSeen}</span>
          {match.watermarkDetected && (
            <>
              <span>•</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  color: '#34d399',
                }}
              >
                <ShieldCheck size={11} />
                Watermark detected
              </span>
            </>
          )}
        </div>

        {/* Match strength */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 78 }}>Match strength</div>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 99,
              background: 'var(--bg-elevated)',
              overflow: 'hidden',
              maxWidth: 180,
            }}
          >
            <div
              style={{
                width: `${match.matchStrength}%`,
                height: '100%',
                background:
                  match.matchStrength >= 90
                    ? '#f87171'
                    : match.matchStrength >= 80
                    ? '#fbbf24'
                    : '#60a5fa',
                transition: 'width 200ms',
              }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', minWidth: 32 }}>
            {match.matchStrength}%
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <ActionButton icon={Eye} label="Investigate" variant="primary" />
          <ActionButton icon={FileText} label="File DMCA" variant="danger" />
          <ActionButton icon={Check} label="Mark as authorized" variant="ghost" />
          <ActionButton icon={X} label="Dismiss" variant="ghost" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Shield;
  label: string;
  variant: 'primary' | 'danger' | 'ghost';
}) {
  const styles: Record<typeof variant, { bg: string; color: string; border: string }> = {
    primary: { bg: 'var(--brand-dim)', color: 'var(--text-brand)', border: '0.5px solid var(--brand-border)' },
    danger: { bg: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '0.5px solid rgba(248, 113, 113, 0.3)' },
    ghost: { bg: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' },
  };
  const s = styles[variant];

  return (
    <button
      type="button"
      style={{
        background: s.bg,
        border: s.border,
        color: s.color,
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: MatchStatus }) {
  const config: Record<MatchStatus, { label: string; color: string; bg: string }> = {
    new: { label: 'New', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    investigating: { label: 'Investigating', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
    filed: { label: 'DMCA Filed', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
    resolved: { label: 'Resolved', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
    authorized: { label: 'Authorized', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
    dismissed: { label: 'Dismissed', color: 'var(--text-tertiary)', bg: 'var(--bg-elevated)' },
  };
  const c = config[status];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: c.color,
        background: c.bg,
        padding: '3px 8px',
        borderRadius: 99,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        flexShrink: 0,
      }}
    >
      {c.label}
    </span>
  );
}

function ScannerCard({ scanner }: { scanner: Scanner }) {
  const isActive = scanner.status === 'active';
  const isRateLimited = scanner.status === 'rate_limited';

  return (
    <div
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)',
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
          {scanner.platform} Scanner
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 500,
            color: isActive ? '#34d399' : isRateLimited ? '#fbbf24' : 'var(--text-tertiary)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isActive ? '#34d399' : isRateLimited ? '#fbbf24' : 'var(--text-tertiary)',
              display: 'inline-block',
              animation: isActive ? 'pulse 2s infinite' : undefined,
            }}
          />
          {isActive ? 'Active' : isRateLimited ? 'Rate limited' : 'Paused'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        {isRateLimited && scanner.retryIn ? `Retry in ${scanner.retryIn}` : `Last scan: ${scanner.lastScan}`}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabId }) {
  const labels: Record<TabId, string> = {
    all: 'No matches found',
    investigating: 'No matches being investigated',
    filed: 'No DMCA claims filed',
    resolved: 'No resolved matches',
    settings: '',
  };
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        border: '0.5px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Shield size={32} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{labels[tab]}</p>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        padding: 20,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        Protection settings
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
        Configure how AnimaForge protects your content across platforms.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SettingRow
          title="Automatic watermarking"
          description="Embed invisible watermarks on every render"
          enabled
        />
        <SettingRow
          title="Auto-file DMCA at 95%+ match"
          description="Automatically file takedown notices for high-confidence matches"
          enabled={false}
        />
        <SettingRow
          title="Notify on new matches"
          description="Email and in-app alerts when piracy is detected"
          enabled
        />
        <SettingRow
          title="Scan private uploads"
          description="Check private and unlisted content across platforms"
          enabled={false}
        />
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  enabled,
}: {
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>
      </div>
      <div
        style={{
          width: 32,
          height: 18,
          borderRadius: 99,
          background: enabled ? 'var(--brand)' : 'var(--bg-elevated)',
          position: 'relative',
          transition: 'background 150ms',
          flexShrink: 0,
          cursor: 'pointer',
          border: '0.5px solid var(--border)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 1,
            left: enabled ? 15 : 1,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 150ms',
          }}
        />
      </div>
    </div>
  );
}
