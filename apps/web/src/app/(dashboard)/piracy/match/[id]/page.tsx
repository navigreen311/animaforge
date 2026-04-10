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
import DMCAFilingWizard, {
  DMCAMatchData,
} from '@/components/piracy/DMCAFilingWizard';

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

// ══════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════

function buildMock(id: string): MatchDetail {
  return {
    id,
    status: 'Reviewing',
    detectedAt: '2 hours ago',
    original: {
      title: 'Cyber Samurai — Opening Scene',
      project: 'Cyber Samurai',
      projectId: 'proj_cyber_samurai',
      duration: '00:42',
      c2paVerified: true,
      watermarkEmbedded: true,
      renderedAt: '2026-03-28',
    },
    infringing: {
      url: 'https://www.youtube.com/watch?v=aB9xK2pLmNq',
      platform: 'YouTube',
      uploader: '@anonreupload',
      uploadDate: '2026-04-07',
      viewCount: 18423,
      title: 'EPIC ANIME FIGHT SCENE (must watch!!)',
    },
    analysis: {
      similarity: 92,
      watermarkDetected: true,
      audioMatch: 88,
      visualMatch: 96,
    },
    timeline: [
      {
        id: 't1',
        label: 'Match detected by automated scan',
        at: '2026-04-09 06:12',
        icon: 'detected',
      },
      {
        id: 't2',
        label: 'AnimaForge watermark extracted and verified',
        at: '2026-04-09 06:13',
        icon: 'flagged',
      },
      {
        id: 't3',
        label: 'Flagged for manual review',
        at: '2026-04-09 06:14',
        icon: 'reviewed',
      },
      {
        id: 't4',
        label: 'Opened by Alex Morgan',
        at: '2026-04-09 07:45',
        icon: 'reviewed',
      },
    ],
  };
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

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
        <circle
          cx={60}
          cy={60}
          r={radius}
          stroke="var(--border)"
          strokeWidth={8}
          fill="none"
        />
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
        <div
          style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
        >
          similarity
        </div>
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
          background: positive
            ? 'rgba(34,197,94,0.12)'
            : 'rgba(100,116,139,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check
          size={12}
          style={{ color: positive ? '#4ade80' : '#94a3b8' }}
        />
      </div>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
        {label}
      </div>
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
  const match = useMemo(() => buildMock(id), [id]);
  const [wizardOpen, setWizardOpen] = useState(false);

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
          <div
            style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
          >
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
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
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
                background:
                  'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
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
                <div style={valueStyle}>
                  {match.infringing.viewCount.toLocaleString()}
                </div>
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
            <AnalysisRow
              label="Audio similarity"
              value={`${match.analysis.audioMatch}%`}
            />
            <AnalysisRow
              label="Visual frame similarity"
              value={`${match.analysis.visualMatch}%`}
            />
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
        <button
          style={primaryBtn}
          onClick={() => setWizardOpen(true)}
        >
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
                <div
                  style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                >
                  {entry.at}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DMCAFilingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        match={wizardData}
      />
    </div>
  );
}
