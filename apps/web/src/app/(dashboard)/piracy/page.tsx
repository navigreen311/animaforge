'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
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
  Fingerprint,
} from 'lucide-react';
import { fetchPiracyCapabilities, isUnavailable } from '@/lib/governance/c2pa';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState, ResourceView } from '@/components/api/ResourceStates';
import type { PiracyCapabilities } from '@/lib/governance/c2pa';

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
  /**
   * Tri-state on purpose. `null` means the watermark service was not consulted,
   * which is a different claim from "no watermark is present".
   */
  watermarkDetected: boolean | null;
  /** How the match was established: perceptual hash, or a recovered watermark. */
  matchMethod: 'perceptual-hash' | 'watermark';
  /** Hamming distance out of 64 bits; lower is a closer match. */
  hammingDistance: number | null;
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

/** One row of GET /api/piracy/matches. */
interface MatchRow {
  id: string;
  outputId: string;
  platform: string;
  matchUrl: string;
  matchStrength: number;
  watermarkFound: boolean;
  matchMethod: string;
  hammingDistance: number | null;
  status: string;
  detectedAt: string;
  evidence: Record<string, unknown> | null;
}

interface MatchList {
  items: MatchRow[];
  total: number;
}

/** One row of GET /api/activity (the audit trail). */
interface ActivityRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  createdAt: string;
}

interface ActivityList {
  items: ActivityRow[];
  total: number;
}

/**
 * Scanner fleet status.
 *
 * There is no scanner-configuration model: the scanners live in
 * services/piracy and expose no console endpoint, so /api/piracy/scanners
 * answers 501. The panel renders that reason rather than a hardcoded fleet
 * that always looks healthy.
 */
interface ScannerList {
  items: Scanner[];
}

const MATCH_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
];

function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/**
 * Map a stored match to the card this screen renders.
 *
 * `watermarkFound` is a boolean column, so the tri-state the card supports
 * collapses: the API records "found" or "not found" and cannot express "not
 * checked". The scan's evidence carries the method it used, so a match made
 * without consulting the watermark service reports null rather than false.
 */
function toMatch(row: MatchRow): PiracyMatch {
  const watermarkChecked =
    typeof row.evidence?.watermark_method === 'string' &&
    row.evidence.watermark_method !== 'not-configured' &&
    row.evidence.watermark_method !== 'request-failed';

  const status: MatchStatus =
    row.status === 'dmca_sent'
      ? 'filed'
      : row.status === 'reviewing'
        ? 'investigating'
        : row.status === 'dismissed'
          ? 'dismissed'
          : 'new';

  return {
    id: row.id,
    originalOutput: row.outputId,
    originalShot: row.outputId.slice(0, 8),
    platform: (row.platform.charAt(0).toUpperCase() + row.platform.slice(1)) as Platform,
    matchUrl: row.matchUrl,
    matchStrength: Math.round(row.matchStrength * 100),
    firstSeen: relativeTime(row.detectedAt),
    watermarkDetected: watermarkChecked ? row.watermarkFound : null,
    matchMethod: row.matchMethod === 'watermark' ? 'watermark' : 'perceptual-hash',
    hammingDistance: row.hammingDistance,
    status,
    gradient:
      MATCH_GRADIENTS[Math.abs(row.id.charCodeAt(0) + row.id.length) % MATCH_GRADIENTS.length],
  };
}

/** Pick an icon from the audit action. Unknown actions get a neutral one. */
function activityIcon(action: string): { icon: typeof Shield; iconColor: string } {
  if (action.includes('dmca')) return { icon: FileText, iconColor: '#f87171' };
  if (action.includes('match')) return { icon: AlertTriangle, iconColor: '#fbbf24' };
  if (action.includes('watermark')) return { icon: ShieldCheck, iconColor: '#34d399' };
  if (action.includes('scan')) return { icon: Search, iconColor: '#a78bfa' };
  return { icon: Shield, iconColor: 'var(--text-tertiary)' };
}

function toActivity(row: ActivityRow): ActivityEntry {
  const { icon, iconColor } = activityIcon(row.action);
  return {
    id: row.id,
    icon,
    iconColor,
    text: `${row.action} · ${row.resource} ${row.resourceId.slice(0, 8)}`,
    time: relativeTime(row.createdAt),
  };
}

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

const SCAN_FREQUENCIES = [
  'Every 5 minutes',
  'Every 15 minutes',
  'Every hour',
  'Every 6 hours',
  'Daily',
];

/* ------------------------------------------------------------------ */
/*  Evidence badges                                                    */
/* ------------------------------------------------------------------ */

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

/**
 * Watermark state, with "not checked" rendered distinctly from "absent".
 * Collapsing the two would let an unconsulted service read as an exoneration.
 */
function WatermarkBadge({ state }: { state: boolean | null }) {
  if (state === true) {
    return (
      <span
        style={{ ...badgeStyle, color: '#34d399' }}
        title="An invisible watermark was recovered from the media itself."
      >
        <ShieldCheck size={11} />
        Watermark recovered
      </span>
    );
  }
  if (state === false) {
    return (
      <span
        style={{ ...badgeStyle, color: 'var(--text-tertiary)' }}
        title="The media was analysed and no AnimaForge watermark was recovered."
      >
        <ShieldAlert size={11} />
        No watermark found
      </span>
    );
  }
  return (
    <span
      style={{ ...badgeStyle, color: '#fbbf24' }}
      title="The watermark service was not reachable or not configured, so no check was performed. This is not evidence either way."
    >
      <ShieldQuestion size={11} />
      Watermark not checked
    </span>
  );
}

/** How the match was reached, and how close it was. */
function EvidenceBadge({
  method,
  distance,
}: {
  method: 'perceptual-hash' | 'watermark';
  distance: number | null;
}) {
  const label = method === 'watermark' ? 'Watermark payload' : 'Perceptual hash';
  return (
    <span
      style={{ ...badgeStyle, color: 'var(--text-tertiary)' }}
      title={
        method === 'watermark'
          ? 'Matched by recovering the embedded watermark payload — the strongest evidence available.'
          : 'Matched by perceptual hash distance. Robust to re-encoding and rescaling; not to heavy cropping or rotation.'
      }
    >
      <Fingerprint size={11} />
      {label}
      {distance !== null ? ` · ${distance}/64 bits` : ''}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Live capability banner                                             */
/* ------------------------------------------------------------------ */

/**
 * Shows what the protection pipeline can actually do right now. Without this
 * the dashboard looks equally confident whether or not scanning is wired up.
 */
function CapabilityBanner() {
  const [capabilities, setCapabilities] = useState<PiracyCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPiracyCapabilities().then((result) => {
      if (cancelled) return;
      if (isUnavailable(result)) setError(result.reason);
      else setCapabilities(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reasons = error ? [error] : (capabilities?.degraded_reasons ?? []);
  if (!error && capabilities && !capabilities.degraded) {
    return (
      <div
        style={{
          margin: '12px 24px 0',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 12,
          color: '#34d399',
          background: 'rgba(52, 211, 153, 0.08)',
          border: '0.5px solid rgba(52, 211, 153, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <ShieldCheck size={13} />
        Protection pipeline fully operational — discovery, fingerprinting and watermark detection
        are all configured.
      </div>
    );
  }
  if (reasons.length === 0) return null;

  return (
    <div
      style={{
        margin: '12px 24px 0',
        padding: '12px 14px',
        borderRadius: 8,
        fontSize: 12,
        color: '#fbbf24',
        background: 'rgba(234, 179, 8, 0.08)',
        border: '0.5px solid rgba(234, 179, 8, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <AlertTriangle size={13} />
        Protection pipeline is running in a reduced state
      </div>
      <ul style={{ margin: '8px 0 0', paddingLeft: 22, lineHeight: 1.7 }}>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p style={{ margin: '8px 0 0', color: 'var(--text-tertiary)' }}>
        Matches listed below are sample data until live scanning is configured.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PiracyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [threshold, setThreshold] = useState(75);
  const [scanFrequency, setScanFrequency] = useState(SCAN_FREQUENCIES[1]);

  const matchState = useResource<MatchList>('/api/piracy/matches?limit=200');
  const activityState = useResource<ActivityList>('/api/activity?limit=20');
  const scannerState = useResource<ScannerList>('/api/piracy/scanners');
  const allMatches = useMemo(() => (matchState.data?.items ?? []).map(toMatch), [matchState.data]);

  const filteredMatches = useMemo(() => {
    if (activeTab === 'all') return allMatches;
    if (activeTab === 'investigating')
      return allMatches.filter((m) => m.status === 'investigating');
    if (activeTab === 'filed') return allMatches.filter((m) => m.status === 'filed');
    if (activeTab === 'resolved') return allMatches.filter((m) => m.status === 'resolved');
    return [];
  }, [activeTab, allMatches]);

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
            Perceptual fingerprinting, invisible watermark recovery, and DMCA management
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

      {/* What the pipeline can actually do right now */}
      <CapabilityBanner />

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
              {matchState.loading && matchState.data === null ? (
                <LoadingState label="Loading matches…" />
              ) : matchState.error ? (
                <ErrorState error={matchState.error} onRetry={matchState.reload} />
              ) : filteredMatches.length === 0 ? (
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
              <ResourceView
                state={activityState}
                isEmpty={(d) => d.items.length === 0}
                emptyTitle="No recent activity"
                loadingLabel="Loading activity…"
              >
                {(list) =>
                  list.items.map(toActivity).map((entry) => {
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
                        <span
                          style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}
                        >
                          {entry.time}
                        </span>
                      </div>
                    );
                  })
                }
              </ResourceView>
            </div>
          </div>
        </div>

        {/* Right sidebar — Active Scanners */}
        <aside
          style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}
        >
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
              <ResourceView
                state={scannerState}
                isEmpty={(d) => d.items.length === 0}
                emptyTitle="No scanners configured"
                loadingLabel="Loading scanners…"
              >
                {(list) =>
                  list.items.map((scanner) => <ScannerCard key={scanner.id} scanner={scanner} />)
                }
              </ResourceView>
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
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
        >
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
            Detected on{' '}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {match.platform}
            </span>
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
          <span>•</span>
          <WatermarkBadge state={match.watermarkDetected} />
          <span>•</span>
          <EvidenceBadge method={match.matchMethod} distance={match.hammingDistance} />
        </div>

        {/* Match strength */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 78 }}>
            Match strength
          </div>
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
          <div
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', minWidth: 32 }}
          >
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
    primary: {
      bg: 'var(--brand-dim)',
      color: 'var(--text-brand)',
      border: '0.5px solid var(--brand-border)',
    },
    danger: {
      bg: 'rgba(248, 113, 113, 0.1)',
      color: '#f87171',
      border: '0.5px solid rgba(248, 113, 113, 0.3)',
    },
    ghost: {
      bg: 'transparent',
      color: 'var(--text-secondary)',
      border: '0.5px solid var(--border)',
    },
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
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
        {isRateLimited && scanner.retryIn
          ? `Retry in ${scanner.retryIn}`
          : `Last scan: ${scanner.lastScan}`}
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
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {description}
        </div>
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
