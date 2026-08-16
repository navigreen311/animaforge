'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  ExternalLink,
  Check,
  Ban,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Calendar,
  User,
  Globe,
  Clock,
  Activity,
} from 'lucide-react';
import DMCAFilingWizard, { DMCAMatchData } from '@/components/piracy/DMCAFilingWizard';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type MatchStatus = 'New' | 'Reviewing' | 'Filed' | 'Resolved' | 'Dismissed';

interface MatchDetail {
  id: string;
  status: MatchStatus;
  detectedAt: string;
  original: {
    title: string;
    project: string;
    projectId: string;
    duration: string;
    c2paVerified: boolean;
    watermarkEmbedded: boolean;
    renderedAt: string;
  };
  infringing: {
    url: string;
    platform: string;
    uploader: string;
    uploadDate: string;
    viewCount: number;
    title: string;
  };
  analysis: {
    similarity: number;
    watermarkDetected: boolean;
    audioMatch: number;
    visualMatch: number;
  };
  timeline: {
    id: string;
    label: string;
    at: string;
    icon: 'detected' | 'reviewed' | 'flagged' | 'filed';
  }[];
}

/** GET /api/piracy/matches/[id]. */
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
  reviewedAt: string | null;
  evidence: Record<string, unknown> | null;
  notices: { id: string; status: string; createdAt: string }[];
}

const STATUS_LABEL: Record<string, MatchStatus> = {
  pending: 'New',
  reviewing: 'Reviewing',
  dismissed: 'Dismissed',
  dmca_sent: 'Filed',
};

/**
 * Map a stored match onto the detail view.
 *
 * `buildMock` used to return the same fabricated case for any id: a named
 * project, a YouTube URL with a view count, an uploader handle, an upload date,
 * separate audio and visual match percentages and a four-entry investigation
 * timeline. A piracy_matches row has none of that. It records what was matched,
 * where, how strongly, by which method, and whether a watermark was recovered.
 *
 * So the original side shows the output id rather than a title (nothing joins a
 * match back to a project), the infringing side shows the URL and platform and
 * omits uploader, upload date and view count, and the analysis shows the single
 * real match strength instead of splitting it into an audio and a visual score
 * that were never computed. The timeline is the timestamps that exist plus any
 * DMCA notices filed.
 */
function toDetail(row: MatchRow): MatchDetail {
  const timeline: MatchDetail['timeline'] = [
    {
      id: 'detected',
      label: `Match detected by ${row.matchMethod || 'scan'}`,
      at: new Date(row.detectedAt).toLocaleString(),
      icon: 'detected',
    },
  ];
  if (row.watermarkFound) {
    timeline.push({
      id: 'watermark',
      label: 'AnimaForge watermark recovered from the copy',
      at: new Date(row.detectedAt).toLocaleString(),
      icon: 'flagged',
    });
  }
  if (row.reviewedAt) {
    timeline.push({
      id: 'reviewed',
      label: 'Reviewed',
      at: new Date(row.reviewedAt).toLocaleString(),
      icon: 'reviewed',
    });
  }
  for (const notice of row.notices ?? []) {
    timeline.push({
      id: notice.id,
      label: `DMCA notice ${notice.status}`,
      at: new Date(notice.createdAt).toLocaleString(),
      icon: 'filed',
    });
  }

  return {
    id: row.id,
    status: STATUS_LABEL[row.status] ?? 'New',
    detectedAt: new Date(row.detectedAt).toLocaleString(),
    original: {
      title: row.outputId,
      project: '',
      projectId: '',
      duration: '',
      c2paVerified: false,
      watermarkEmbedded: row.watermarkFound,
      renderedAt: '',
    },
    infringing: {
      url: row.matchUrl,
      platform: row.platform,
      uploader: '',
      uploadDate: '',
      viewCount: 0,
      title: '',
    },
    analysis: {
      similarity: Math.round(row.matchStrength * 100),
      watermarkDetected: row.watermarkFound,
      audioMatch: 0,
      visualMatch: 0,
    },
    timeline,
  };
}

const pageStyle: React.CSSProperties = {
  padding: '24px 28px',
  color: 'var(--text-primary)',
  maxWidth: 1200,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '0.5px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardBodyStyle: React.CSSProperties = {
  padding: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 500,
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-primary)',
  fontWeight: 500,
};

const primaryBtn: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const statusColors: Record<MatchStatus, { bg: string; fg: string; border: string }> = {
  New: {
    bg: 'rgba(239,68,68,0.12)',
    fg: '#f87171',
    border: 'rgba(239,68,68,0.3)',
  },
  Reviewing: {
    bg: 'rgba(245,158,11,0.12)',
    fg: '#fbbf24',
    border: 'rgba(245,158,11,0.3)',
  },
  Filed: {
    bg: 'rgba(124,58,237,0.12)',
    fg: '#a78bfa',
    border: 'rgba(124,58,237,0.3)',
  },
  Resolved: {
    bg: 'rgba(34,197,94,0.12)',
    fg: '#4ade80',
    border: 'rgba(34,197,94,0.3)',
  },
  Dismissed: {
    bg: 'rgba(100,116,139,0.12)',
    fg: '#94a3b8',
    border: 'rgba(100,116,139,0.3)',
  },
};

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function Gauge({ value }: { value: number }) {
  const radius = 48;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 90 ? '#f87171' : value >= 70 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width={120} height={120}>
        <circle cx={60} cy={60} r={radius} stroke="var(--border)" strokeWidth={8} fill="none" />
        <circle
          cx={60}
          cy={60}
          r={radius}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {value}%
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>similarity</div>
      </div>
    </div>
  );
}

function AnalysisRow({
  label,
  value,
  positive = true,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={12} style={{ color: positive ? '#4ade80' : '#94a3b8' }} />
      </div>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? 'unknown';
  const state = useResource<MatchRow>(`/api/piracy/matches/${id}`, [id]);
  const detail = useMemo(() => (state.data ? toDetail(state.data) : null), [state.data]);
  const [wizardOpen, setWizardOpen] = useState(false);

  if (state.loading) return <LoadingState label="Loading match" />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!detail) return <ErrorState error={{ code: 'NOT_FOUND', message: 'No such match.' }} />;

  const match = detail;
  const status = statusColors[match.status];

  const wizardData: DMCAMatchData = {
    id: match.id,
    originalTitle: match.original.title,
    originalProject: match.original.project,
    originalDuration: match.original.duration,
    c2paVerified: match.original.c2paVerified,
    watermarkDetected: match.analysis.watermarkDetected,
    matchUrl: match.infringing.url,
    platform: match.infringing.platform,
    matchStrength: match.analysis.similarity,
    uploader: match.infringing.uploader,
  };

  return (
    <div style={pageStyle}>
      {/* BACK LINK */}
      <Link
        href="/piracy"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={12} /> Back to matches
      </Link>

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Match #{match.id}
            </h1>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 999,
                background: status.bg,
                color: status.fg,
                border: `0.5px solid ${status.border}`,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {match.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Detected {match.detectedAt}
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* ORIGINAL */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Shield size={14} style={{ color: 'var(--brand)' }} />
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Original Content
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                marginBottom: 14,
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Title</div>
              <div style={valueStyle}>{match.original.title}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Project</div>
              <Link
                href={`/projects/${match.original.projectId}`}
                style={{
                  ...valueStyle,
                  color: 'var(--brand)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {match.original.project} <ExternalLink size={10} />
              </Link>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Duration</div>
              <div style={valueStyle}>{match.original.duration}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Rendered</div>
              <div style={valueStyle}>{match.original.renderedAt}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {match.original.c2paVerified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: 'rgba(34,197,94,0.12)',
                    color: '#4ade80',
                    border: '0.5px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <Check size={10} /> C2PA Verified
                </span>
              )}
              {match.original.watermarkEmbedded && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: 'rgba(124,58,237,0.12)',
                    color: '#a78bfa',
                    border: '0.5px solid rgba(124,58,237,0.3)',
                  }}
                >
                  <Shield size={10} /> Watermark embedded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* INFRINGING */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Match Content
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                marginBottom: 14,
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Title</div>
              <div style={valueStyle}>{match.infringing.title}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Source URL</div>
              <a
                href={match.infringing.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: 'var(--brand)',
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {match.infringing.url} <ExternalLink size={10} />
              </a>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <div style={labelStyle}>
                  <Globe size={9} style={{ display: 'inline', marginRight: 2 }} />
                  Platform
                </div>
                <div style={valueStyle}>{match.infringing.platform}</div>
              </div>
              <div>
                <div style={labelStyle}>
                  <User size={9} style={{ display: 'inline', marginRight: 2 }} />
                  Uploader
                </div>
                <div style={valueStyle}>{match.infringing.uploader}</div>
              </div>
              <div>
                <div style={labelStyle}>
                  <Eye size={9} style={{ display: 'inline', marginRight: 2 }} />
                  Views
                </div>
                <div style={valueStyle}>{match.infringing.viewCount.toLocaleString()}</div>
              </div>
              <div>
                <div style={labelStyle}>
                  <Calendar size={9} style={{ display: 'inline', marginRight: 2 }} />
                  Uploaded
                </div>
                <div style={valueStyle}>{match.infringing.uploadDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYSIS CARD */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={cardHeaderStyle}>
          <Activity size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Match Analysis
          </div>
        </div>
        <div
          style={{
            ...cardBodyStyle,
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Gauge value={match.analysis.similarity} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <AnalysisRow
              label="AnimaForge watermark detected"
              value="Verified"
              positive={match.analysis.watermarkDetected}
            />
            <AnalysisRow label="Audio similarity" value={`${match.analysis.audioMatch}%`} />
            <AnalysisRow label="Visual frame similarity" value={`${match.analysis.visualMatch}%`} />
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <button style={primaryBtn} onClick={() => setWizardOpen(true)}>
          <FileText size={14} /> File DMCA
        </button>
        <button style={ghostBtn}>
          <CheckCircle2 size={14} /> Mark as authorized
        </button>
        <button style={ghostBtn}>
          <Ban size={14} /> Dismiss as false positive
        </button>
        <button style={ghostBtn}>
          <Shield size={14} /> Add to allowlist
        </button>
      </div>

      {/* TIMELINE */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Clock size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Activity Timeline
          </div>
        </div>
        <div style={cardBodyStyle}>
          {match.timeline.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 12,
                paddingBottom: idx === match.timeline.length - 1 ? 0 : 14,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                {idx < match.timeline.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      background: 'var(--border)',
                      marginTop: 2,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {entry.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{entry.at}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DMCAFilingWizard open={wizardOpen} onClose={() => setWizardOpen(false)} match={wizardData} />
    </div>
  );
}
