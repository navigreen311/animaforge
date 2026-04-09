'use client';

import { useState, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut,
  Check, AlertCircle, Loader2, ChevronDown, ChevronRight,
  X, Plus, Image, Shield, ShieldCheck, RefreshCw, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { PreviewPanel } from '../components/timeline/PreviewPanel';
import { TakesDrawer, createMockTakes } from '@/components/timeline/TakesDrawer';
import type { Take } from '@/components/timeline/TakesDrawer';

// ── Types ────────────────────────────────────────────────────
type ShotStatus = 'draft' | 'generating' | 'review' | 'approved' | 'failed';

interface Clip {
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
  color: string;
  trackId: string;
  shotNumber?: number;
  status?: ShotStatus;
  prompt?: string;
  camera?: string;
  motion?: string;
  emotion?: string;
  characters?: string[];
}

interface Track {
  id: string;
  name: string;
  clips: Clip[];
}

interface GenerationState {
  clipId: string;
  progress: number;
  tier: string;
  done: boolean;
  qualityScores?: { fidelity: number; motion: number; consistency: number };
}

interface CommentMarker {
  id: string;
  timeSec: number;
  color: string;
  label: string;
}

// ── Mock Data ────────────────────────────────────────────────
const INITIAL_TRACKS: Track[] = [
  {
    id: 'video',
    name: 'Video',
    clips: [
      {
        id: 'v1', label: 'Shot 1 - Intro', startSec: 0, durationSec: 38,
        color: '#7c3aed', trackId: 'video', shotNumber: 1, status: 'approved',
        prompt: 'A sweeping aerial view of the enchanted forest at dawn, golden light filtering through ancient trees.',
        camera: 'Aerial', motion: 'Dolly', emotion: 'Mysterious',
        characters: ['Aria', 'Kael'],
      },
      {
        id: 'v2', label: 'Shot 2 - Battle Scene', startSec: 42, durationSec: 55,
        color: '#6d28d9', trackId: 'video', shotNumber: 2, status: 'review',
        prompt: 'Two warriors clash swords in a rain-soaked courtyard, sparks flying with each strike.',
        camera: 'Medium', motion: 'Handheld', emotion: 'Dramatic',
        characters: ['Kael', 'Morath'],
      },
      {
        id: 'v3', label: 'Shot 3 - Epilogue', startSec: 102, durationSec: 30,
        color: '#8b5cf6', trackId: 'video', shotNumber: 3, status: 'draft',
        prompt: '',
        camera: 'Wide', motion: 'Static', emotion: 'Melancholic',
        characters: ['Aria'],
      },
      {
        id: 'v4', label: 'Shot 4 - Chase', startSec: 136, durationSec: 35,
        color: '#7c3aed', trackId: 'video', shotNumber: 4, status: 'generating',
        prompt: 'A tense chase through narrow alleyways, dramatic lighting.',
        camera: 'POV', motion: 'Handheld', emotion: 'Tense',
        characters: ['Kael'],
      },
      {
        id: 'v5', label: 'Shot 5 - Failed Render', startSec: 175, durationSec: 25,
        color: '#6d28d9', trackId: 'video', shotNumber: 5, status: 'failed',
        prompt: 'Wide establishing shot of the burning city at dusk.',
        camera: 'Wide', motion: 'Dolly', emotion: 'Dramatic',
        characters: ['Aria', 'Morath'],
      },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    clips: [
      { id: 'a1', label: 'Background Music', startSec: 0, durationSec: 90, color: '#0891b2', trackId: 'audio' },
      { id: 'a2', label: 'Dialogue Track', startSec: 95, durationSec: 50, color: '#0e7490', trackId: 'audio' },
    ],
  },
  {
    id: 'effects',
    name: 'Effects',
    clips: [
      { id: 'e1', label: 'SFX - Explosion', startSec: 44, durationSec: 12, color: '#c2410c', trackId: 'effects' },
      { id: 'e2', label: 'SFX - Wind', startSec: 70, durationSec: 25, color: '#ea580c', trackId: 'effects' },
      { id: 'e3', label: 'Transition - Fade', startSec: 100, durationSec: 6, color: '#d97706', trackId: 'effects' },
    ],
  },
];

const COMMENT_MARKERS: CommentMarker[] = [
  { id: 'cm1', timeSec: 22, color: '#eab308', label: 'Pacing note' },
  { id: 'cm2', timeSec: 68, color: '#ef4444', label: 'Fix continuity' },
  { id: 'cm3', timeSec: 115, color: '#22c55e', label: 'Looks great' },
];

const MOCK_CHARACTERS = ['Aria', 'Kael', 'Morath', 'Lyra', 'Dren'];

const CAMERA_OPTIONS = ['Wide', 'Medium', 'Close-up', 'Extreme CU', 'Aerial', 'POV'];
const MOTION_OPTIONS = ['Static', 'Pan', 'Tilt', 'Dolly', 'Orbit', 'Handheld'];
const EMOTION_OPTIONS = ['Neutral', 'Tense', 'Joyful', 'Melancholic', 'Dramatic', 'Mysterious'];
const TIER_OPTIONS = [
  { label: 'Preview', cost: 0.1 },
  { label: 'Standard', cost: 0.5 },
  { label: 'Final', cost: 2.0 },
];

const TOTAL_DURATION_SEC = 225;
const TIME_MARKERS = [0, 30, 60, 90, 120, 150, 180, 210];

// ── Helpers ──────────────────────────────────────────────────
function formatTimecode(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimecodeHMS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusStyle(status: ShotStatus | undefined): React.CSSProperties {
  switch (status) {
    case 'draft':
      return {
        background: 'rgba(255,255,255,0.06)',
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.15)',
        opacity: 0.6,
      };
    case 'generating':
      return {
        background: 'rgba(124,58,237,0.35)',
        borderColor: 'rgba(124,58,237,0.6)',
        animation: 'shot-pulse 2s ease-in-out infinite',
        boxShadow: '0 0 12px rgba(124,58,237,0.4)',
      };
    case 'review':
      return {
        background: 'rgba(59,130,246,0.25)',
        borderColor: 'rgba(59,130,246,0.5)',
        boxShadow: '0 0 0 1px rgba(59,130,246,0.5)',
      };
    case 'approved':
      return {
        background: 'rgba(16,185,129,0.25)',
        borderColor: 'rgba(16,185,129,0.7)',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.5)',
      };
    case 'failed':
      return {
        background: 'rgba(239,68,68,0.2)',
        borderColor: 'rgba(239,68,68,0.5)',
        boxShadow: '0 0 0 1px rgba(239,68,68,0.5)',
        opacity: 0.75,
      };
    default:
      return {};
  }
}

function ShotStatusIcon({ status }: { status: ShotStatus | undefined }) {
  if (!status || status === 'draft') return null;
  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    top: 2,
    right: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };
  switch (status) {
    case 'approved':
      return (
        <span style={iconStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(16,185,129,0.9)" strokeWidth="2" />
            <path d="M8 12l3 3 5-5" stroke="rgba(16,185,129,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case 'generating':
      return (
        <span style={iconStyle} className="shot-status-spin">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a10 10 0 0 1 10 10" stroke="rgba(124,58,237,0.9)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'review':
      return (
        <span style={iconStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(59,130,246,0.9)" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="rgba(59,130,246,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case 'failed':
      return (
        <span style={iconStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(239,68,68,0.9)" strokeWidth="2" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="rgba(239,68,68,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}

function statusBadge(status: ShotStatus | undefined) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    draft:      { bg: 'rgba(255,255,255,0.1)', fg: 'var(--text-tertiary)', label: 'Draft' },
    generating: { bg: 'var(--brand-dim)',       fg: 'var(--brand-light)',   label: 'Generating' },
    review:     { bg: 'rgba(59,130,246,0.15)',  fg: '#60a5fa',             label: 'Review' },
    approved:   { bg: 'rgba(34,197,94,0.15)',   fg: '#4ade80',             label: 'Approved' },
    failed:     { bg: 'rgba(239,68,68,0.15)',   fg: '#f87171',             label: 'Failed' },
  };
  const s = map[status ?? 'draft'] ?? map.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.fg, textTransform: 'uppercase', letterSpacing: '0.3px',
    }}>
      {s.label}
    </span>
  );
}

// ── Reusable Micro Components ────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500,
};

const fieldStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-elevated)',
  padding: '6px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
  width: '100%', boxSizing: 'border-box',
};

function SegmentedControl({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 2, background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)', padding: 2, border: '1px solid var(--border)',
    }}>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} style={{
          flex: '1 1 auto', minWidth: 0, padding: '4px 6px', fontSize: 10, fontWeight: 500,
          border: 'none', borderRadius: 4, cursor: 'pointer', transition: 'all 100ms',
          background: value === opt ? 'var(--brand)' : 'transparent',
          color: value === opt ? '#fff' : 'var(--text-secondary)',
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function TimelinePage() {
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedClipId, setSelectedClipId] = useState<string>('v1');
  const [playheadSec] = useState(84);
  const [generationState, setGenerationState] = useState<GenerationState | null>(null);
  const [selectedTier, setSelectedTier] = useState(1); // Standard
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [takesDrawerOpen, setTakesDrawerOpen] = useState(false);
  const [mockTakes, setMockTakes] = useState<Take[]>([]);
  const [previewCollapsed, setPreviewCollapsed] = useState(true);

  const timelineWidthPx = 600 + zoom * 8;

  // Derived: find the selected clip from tracks
  const selectedClip: Clip | null = (() => {
    for (const t of tracks) {
      const c = t.clips.find((c) => c.id === selectedClipId);
      if (c) return c;
    }
    return null;
  })();

  const isVideoClip = selectedClip?.trackId === 'video';

  // Update a clip field
  const updateClip = useCallback((clipId: string, patch: Partial<Clip>) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      })),
    );
  }, []);

  // Simulate generation
  const handleGenerate = useCallback(() => {
    if (!selectedClip || generationState?.clipId === selectedClip.id) return;
    const tier = TIER_OPTIONS[selectedTier];
    updateClip(selectedClip.id, { status: 'generating' });
    const state: GenerationState = { clipId: selectedClip.id, progress: 0, tier: tier.label, done: false };
    setGenerationState(state);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setGenerationState({
          clipId: selectedClip.id, progress: 100, tier: tier.label, done: true,
          qualityScores: {
            fidelity: Math.round(82 + Math.random() * 15),
            motion: Math.round(78 + Math.random() * 18),
            consistency: Math.round(85 + Math.random() * 12),
          },
        });
        updateClip(selectedClip.id, { status: 'review' });
      } else {
        setGenerationState((prev) => prev ? { ...prev, progress } : prev);
      }
    }, 400);
  }, [selectedClip, generationState, selectedTier, updateClip]);

  const handleApprove = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, { status: 'approved' });
    // Mock API call + toast
    setTimeout(() => {
      toast.success(`Shot #${selectedClip.shotNumber ?? '?'} approved`);
    }, 200);
  }, [selectedClip, updateClip]);

  const handleRegenerate = useCallback(() => {
    if (!selectedClip) return;
    setGenerationState(null);
    updateClip(selectedClip.id, { status: 'draft' });
  }, [selectedClip, updateClip]);

  const handleOpenTakes = useCallback(() => {
    if (!selectedClip) return;
    setMockTakes(createMockTakes(selectedClip.shotNumber ?? 1));
    setTakesDrawerOpen(true);
  }, [selectedClip]);

  const handleSelectTake = useCallback((takeId: string) => {
    setMockTakes((prev) =>
      prev.map((t) => ({ ...t, isActive: t.id === takeId })),
    );
  }, []);

  const handleGenerateNewTake = useCallback((tier: string) => {
    toast.success(`Generating new ${tier} take...`);
  }, []);

  // ── Render ──────────────────────────────────────────────────
  return (
    <ErrorBoundary>
    <>
      {/* Inject keyframe for pulse animation */}
      <style>{`
        @keyframes brand-pulse {
          0%, 100% { box-shadow: 0 0 6px var(--brand); }
          50% { box-shadow: 0 0 18px var(--brand), 0 0 30px var(--brand-dim); }
        }
        @keyframes shot-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        @keyframes shot-status-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .shot-status-spin svg {
          animation: shot-status-spin 1s linear infinite;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* ── Page Header ─────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 0', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Timeline Editor
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 16px' }}>
            Edit and arrange shots on the timeline
          </p>
        </div>

        {/* ── Playback Controls Bar ───────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px',
          background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        }}>
          {/* Transport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => {}} style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center',
            }}>
              <SkipBack size={15} />
            </button>
            <button type="button" onClick={() => setPlaying(!playing)} style={{
              background: 'var(--brand)', border: 'none', color: '#ffffff',
              cursor: 'pointer', padding: 8, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
            }}>
              {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
            </button>
            <button type="button" onClick={() => {}} style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center',
            }}>
              <SkipForward size={15} />
            </button>
          </div>

          {/* Timecode */}
          <div style={{
            fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)',
            background: 'var(--bg-base)', padding: '4px 12px',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
            letterSpacing: '0.5px',
          }}>
            {formatTimecodeHMS(playheadSec)} / 00:03:45
          </div>

          <div style={{ flex: 1 }} />

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ZoomOut size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input type="range" min={10} max={100} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: 100, accentColor: 'var(--brand)', cursor: 'pointer' }}
            />
            <ZoomIn size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 32 }}>
              {zoom}%
            </span>
          </div>
        </div>

        {/* ── Preview Viewport ─────────────────────────────────── */}
        <PreviewPanel
          isCollapsed={previewCollapsed}
          onToggleCollapse={() => setPreviewCollapsed((p) => !p)}
          currentTimecode={formatTimecodeHMS(playheadSec)}
          totalDuration="00:03:45"
          selectedShot={
            selectedClip && isVideoClip
              ? {
                  name: selectedClip.label,
                  status: selectedClip.status === 'approved' ? 'generated' : (selectedClip.status ?? 'draft'),
                }
              : undefined
          }
          onGenerate={handleGenerate}
        />

        {/* ── Main Content: Timeline + Properties ─────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* ── Timeline Area ────────────────────────────────── */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', background: 'var(--bg-base)' }}>
            <div style={{ minWidth: timelineWidthPx + 100, padding: '0 0 16px' }}>
              {/* ── Ruler ──────────────────────────────────── */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', height: 32, marginLeft: 100,
                borderBottom: '1px solid var(--border)', position: 'relative',
              }}>
                {TIME_MARKERS.map((sec) => {
                  const leftPx = (sec / TOTAL_DURATION_SEC) * timelineWidthPx;
                  return (
                    <div key={sec} style={{
                      position: 'absolute', left: leftPx, bottom: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                      <span style={{
                        fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4,
                        fontFamily: 'monospace',
                      }}>
                        {formatTimecode(sec)}
                      </span>
                      <div style={{ width: 1, height: 8, background: 'var(--border)' }} />
                    </div>
                  );
                })}
                {/* Playhead on ruler */}
                <div style={{
                  position: 'absolute',
                  left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx,
                  bottom: 0, width: 2, height: 14, background: '#ef4444',
                  borderRadius: '1px 1px 0 0',
                }} />
                <div style={{
                  position: 'absolute',
                  left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx - 4,
                  bottom: 10, width: 0, height: 0,
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderTop: '6px solid #ef4444',
                }} />
              </div>

              {/* ── Comment Markers Strip ──────────────────── */}
              <div style={{
                display: 'flex', borderBottom: '1px solid var(--border)', height: 24,
              }}>
                <div style={{
                  width: 100, flexShrink: 0, display: 'flex', alignItems: 'center',
                  padding: '0 12px', background: 'var(--bg-surface)',
                  borderRight: '1px solid var(--border)',
                  fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)',
                }}>
                  Notes
                </div>
                <div style={{
                  flex: 1, position: 'relative', minWidth: timelineWidthPx,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  {/* Playhead line */}
                  <div style={{
                    position: 'absolute',
                    left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx,
                    top: 0, bottom: 0, width: 1,
                    background: 'rgba(239, 68, 68, 0.5)', zIndex: 10, pointerEvents: 'none',
                  }} />
                  {COMMENT_MARKERS.map((marker) => {
                    const leftPx = (marker.timeSec / TOTAL_DURATION_SEC) * timelineWidthPx;
                    return (
                      <div key={marker.id} title={marker.label} style={{
                        position: 'absolute', left: leftPx - 5, top: 4,
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: `10px solid ${marker.color}`,
                        cursor: 'pointer', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }} />
                    );
                  })}
                </div>
              </div>

              {/* ── Tracks ─────────────────────────────────── */}
              {tracks.map((track) => (
                <div key={track.id} style={{
                  display: 'flex', borderBottom: '1px solid var(--border)', minHeight: 56,
                }}>
                  {/* Track label */}
                  <div style={{
                    width: 100, flexShrink: 0, display: 'flex', alignItems: 'center',
                    padding: '0 12px', background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                  }}>
                    {track.name}
                  </div>

                  {/* Track lane */}
                  <div style={{
                    flex: 1, position: 'relative', minWidth: timelineWidthPx, padding: '8px 0',
                  }}>
                    {/* Playhead line */}
                    <div style={{
                      position: 'absolute',
                      left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx,
                      top: 0, bottom: 0, width: 1,
                      background: 'rgba(239, 68, 68, 0.5)', zIndex: 10, pointerEvents: 'none',
                    }} />

                    {track.clips.map((clip) => {
                      const leftPct = (clip.startSec / TOTAL_DURATION_SEC) * 100;
                      const widthPct = (clip.durationSec / TOTAL_DURATION_SEC) * 100;
                      const isSelected = selectedClipId === clip.id;
                      const sStatus = statusStyle(clip.status);
                      return (
                        <div
                          key={clip.id}
                          onClick={() => setSelectedClipId(clip.id)}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`, width: `${widthPct}%`,
                            top: 8, bottom: 8,
                            borderRadius: 4, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', padding: '0 8px',
                            overflow: 'hidden', whiteSpace: 'nowrap',
                            border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                            opacity: isSelected ? 1 : (sStatus.opacity as number | undefined) ?? 0.85,
                            transition: 'opacity 120ms ease, border-color 120ms ease, box-shadow 200ms ease',
                            background: sStatus.background ?? clip.color,
                            ...sStatus,
                            ...(isSelected ? { border: '2px solid #ffffff', boxShadow: `0 0 0 1px var(--brand), ${sStatus.boxShadow ?? ''}` } : {}),
                          }}
                        >
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: '#ffffff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            flex: 1,
                          }}>
                            {clip.label}
                          </span>
                          {clip.trackId === 'video' && <ShotStatusIcon status={clip.status} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Properties Panel (280px) ────────────────────── */}
          <div style={{
            width: 280, flexShrink: 0, background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)', overflowY: 'auto',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              margin: 0, paddingBottom: 12, borderBottom: '1px solid var(--border)',
            }}>
              Properties
            </h2>

            {!selectedClip ? (
              /* ── MODE C: Nothing selected ───────────────── */
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8, padding: '40px 16px', textAlign: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
                  Select a shot to edit its properties, scene graph, and generate output.
                </p>
              </div>
            ) : isVideoClip ? (
              /* ── MODE A: Shot selected (full editor) ────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>

                {/* ── Section 1: Identity ──────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: 'var(--brand-dim)', color: 'var(--brand-light)',
                      fontFamily: 'monospace',
                    }}>
                      #{selectedClip.shotNumber ?? '?'}
                    </span>
                    {statusBadge(selectedClip.status)}
                  </div>
                  <div>
                    <label style={labelStyle}>Clip Name</label>
                    <input
                      type="text"
                      value={selectedClip.label}
                      onChange={(e) => updateClip(selectedClip.id, { label: e.target.value })}
                      style={{ ...fieldStyle, outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Duration</label>
                      <div style={fieldStyle}>{formatTimecode(selectedClip.durationSec)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Status</label>
                      <div style={fieldStyle}>{selectedClip.status ?? 'draft'}</div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* ── Section 2: Scene Graph ───────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scene Graph
                  </span>

                  {/* Prompt */}
                  <div>
                    <label style={labelStyle}>Prompt</label>
                    <textarea
                      rows={4}
                      placeholder="Describe what happens..."
                      value={selectedClip.prompt ?? ''}
                      onChange={(e) => updateClip(selectedClip.id, { prompt: e.target.value })}
                      style={{
                        ...fieldStyle, resize: 'vertical', fontFamily: 'inherit',
                        lineHeight: '1.4', minHeight: 72,
                      }}
                    />
                  </div>

                  {/* Characters */}
                  <div>
                    <label style={labelStyle}>Characters</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(selectedClip.characters ?? []).map((char) => (
                        <span key={char} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 99,
                          background: 'var(--brand-dim)', color: 'var(--brand-light)',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          {char}
                          <X size={10} style={{ cursor: 'pointer', opacity: 0.7 }}
                            onClick={() => updateClip(selectedClip.id, {
                              characters: (selectedClip.characters ?? []).filter((c) => c !== char),
                            })}
                          />
                        </span>
                      ))}
                      <button type="button" onClick={() => {
                        const available = MOCK_CHARACTERS.filter(
                          (c) => !(selectedClip.characters ?? []).includes(c),
                        );
                        if (available.length > 0) {
                          updateClip(selectedClip.id, {
                            characters: [...(selectedClip.characters ?? []), available[0]],
                          });
                        }
                      }} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 99,
                        background: 'var(--bg-elevated)', color: 'var(--text-tertiary)',
                        border: '1px dashed var(--border)', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        <Plus size={10} /> Add character
                      </button>
                    </div>
                  </div>

                  {/* Camera */}
                  <div>
                    <label style={labelStyle}>Camera</label>
                    <SegmentedControl
                      options={CAMERA_OPTIONS}
                      value={selectedClip.camera ?? 'Wide'}
                      onChange={(v) => updateClip(selectedClip.id, { camera: v })}
                    />
                  </div>

                  {/* Motion */}
                  <div>
                    <label style={labelStyle}>Motion Style</label>
                    <SegmentedControl
                      options={MOTION_OPTIONS}
                      value={selectedClip.motion ?? 'Static'}
                      onChange={(v) => updateClip(selectedClip.id, { motion: v })}
                    />
                  </div>

                  {/* Emotional Beat */}
                  <div>
                    <label style={labelStyle}>Emotional Beat</label>
                    <select
                      value={selectedClip.emotion ?? 'Neutral'}
                      onChange={(e) => updateClip(selectedClip.id, { emotion: e.target.value })}
                      style={{
                        ...fieldStyle, cursor: 'pointer', appearance: 'auto',
                      }}
                    >
                      {EMOTION_OPTIONS.map((em) => (
                        <option key={em} value={em}>{em}</option>
                      ))}
                    </select>
                  </div>

                  {/* Style Reference */}
                  <div>
                    <label style={labelStyle}>Style Reference</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{
                        width: 48, height: 32, borderRadius: 4,
                        background: `linear-gradient(135deg, ${selectedClip.color}, #1a1a2e)`,
                        border: '1px solid var(--border)', flexShrink: 0,
                      }} />
                      <button type="button" style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                      }}>
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* ── Section 3: Generation ────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Generation
                  </span>

                  {/* Tier selector */}
                  <div>
                    <label style={labelStyle}>Quality Tier</label>
                    <div style={{
                      display: 'flex', gap: 4, background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-lg)', padding: 3, border: '1px solid var(--border)',
                    }}>
                      {TIER_OPTIONS.map((tier, idx) => (
                        <button key={tier.label} type="button"
                          onClick={() => setSelectedTier(idx)}
                          style={{
                            flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 500,
                            border: 'none', borderRadius: 4, cursor: 'pointer',
                            background: selectedTier === idx ? 'var(--brand)' : 'transparent',
                            color: selectedTier === idx ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 100ms',
                          }}
                        >
                          {tier.label}
                          <br />
                          <span style={{ fontSize: 9, opacity: 0.8 }}>{tier.cost}cr</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cost display */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Estimated cost</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {TIER_OPTIONS[selectedTier].cost} credits
                    </span>
                  </div>

                  {/* Generation progress or button */}
                  {generationState && generationState.clipId === selectedClip.id && !generationState.done ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12, color: 'var(--brand-light)',
                      }}>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        Generating ({generationState.tier})...
                      </div>
                      <div style={{
                        width: '100%', height: 6, borderRadius: 3,
                        background: 'var(--bg-elevated)', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(generationState.progress, 100)}%`,
                          height: '100%', borderRadius: 3,
                          background: 'var(--brand)',
                          transition: 'width 300ms ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                        {Math.round(generationState.progress)}%
                      </span>
                      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : (
                    <button type="button" onClick={handleGenerate} style={{
                      width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                      background: 'var(--brand)', color: '#ffffff',
                      transition: 'opacity 120ms',
                    }}>
                      Generate Shot
                    </button>
                  )}
                </div>

                {/* ── Section 4: Latest Generation Output ───── */}
                {(() => {
                  // Show for demo: always show when shot status is review/approved,
                  // or when generation just completed
                  const showOutput =
                    (generationState && generationState.clipId === selectedClip.id && generationState.done) ||
                    selectedClip.status === 'review' ||
                    selectedClip.status === 'approved';

                  if (!showOutput) return null;

                  // Quality scores: use real ones from generation or mock defaults
                  const qualityScores = [
                    {
                      label: 'Temporal stability',
                      value: generationState?.qualityScores?.consistency ?? 92,
                    },
                    {
                      label: 'Identity drift',
                      value: generationState?.qualityScores?.fidelity != null
                        ? 100 - generationState.qualityScores.fidelity
                        : 4,
                    },
                    {
                      label: 'Lip sync',
                      value: null as number | null, // N/A for demo
                    },
                  ];

                  function qScoreColor(val: number | null): string {
                    if (val === null) return 'var(--text-tertiary)';
                    if (val >= 85) return '#4ade80';
                    if (val >= 70) return '#facc15';
                    return '#f87171';
                  }

                  return (
                    <>
                      <div style={{ height: 1, background: 'var(--border)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Header + "View all takes" link */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>
                            Latest Generation
                          </span>
                          <button
                            type="button"
                            onClick={handleOpenTakes}
                            style={{
                              fontSize: 10, fontWeight: 500, color: 'var(--brand-light)',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              textDecoration: 'underline', padding: 0,
                            }}
                          >
                            View all takes (3)
                          </button>
                        </div>

                        {/* Output Thumbnail */}
                        <div style={{
                          width: '100%', height: 120, borderRadius: 'var(--radius-lg)',
                          background: `linear-gradient(135deg, ${selectedClip.color}, #0f0f23, ${selectedClip.color}55)`,
                          border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>
                            Generated Frame
                          </span>
                          {/* C2PA badge overlay */}
                          <div style={{
                            position: 'absolute', bottom: 6, right: 6,
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 9, fontWeight: 600, padding: '3px 8px',
                            borderRadius: 4, background: 'rgba(0,0,0,0.75)',
                            color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)',
                          }}>
                            <ShieldCheck size={10} /> C2PA Signed
                          </div>
                        </div>

                        {/* Quality Scores with progress bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {qualityScores.map((qs) => {
                            const color = qScoreColor(qs.value);
                            const displayValue = qs.value !== null ? `${qs.value}%` : 'N/A';
                            const barWidth = qs.value !== null ? qs.value : 0;

                            return (
                              <div key={qs.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                    {qs.label}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 600, color }}>
                                    {displayValue}
                                  </span>
                                </div>
                                <div style={{
                                  width: '100%', height: 3, borderRadius: 2,
                                  background: 'var(--bg-elevated)', overflow: 'hidden',
                                }}>
                                  <div style={{
                                    width: `${barWidth}%`,
                                    height: '100%',
                                    borderRadius: 2,
                                    background: qs.value !== null ? color : 'transparent',
                                    transition: 'width 300ms ease',
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Action buttons: Approve, Regenerate, Takes */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={handleApprove} style={{
                            flex: 1, padding: '7px 8px', fontSize: 11, fontWeight: 600,
                            border: '1px solid #22c55e', borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer', background: 'rgba(34,197,94,0.12)',
                            color: '#4ade80', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 4,
                          }}>
                            <Check size={12} /> Approve
                          </button>
                          <button type="button" onClick={handleRegenerate} style={{
                            flex: 1, padding: '7px 8px', fontSize: 11, fontWeight: 600,
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer', background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 4,
                          }}>
                            <RefreshCw size={11} /> Regenerate
                          </button>
                          <button type="button" onClick={handleOpenTakes} style={{
                            padding: '7px 10px', fontSize: 11, fontWeight: 600,
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer', background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 4,
                          }}>
                            <Layers size={11} /> Takes
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* ── Section 5: Meta (collapsible) ────────── */}
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div>
                  <button type="button" onClick={() => setMetaExpanded(!metaExpanded)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    padding: '4px 0', border: 'none', background: 'transparent',
                    cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11,
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {metaExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Meta
                  </button>
                  {metaExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
                      {[
                        { label: 'Start Time', value: formatTimecode(selectedClip.startSec) },
                        { label: 'End Time', value: formatTimecode(selectedClip.startSec + selectedClip.durationSec) },
                        { label: 'Layer', value: tracks.find((t) => t.clips.some((c) => c.id === selectedClip.id))?.name ?? '---' },
                        { label: 'Opacity', value: '100%' },
                      ].map((prop) => (
                        <div key={prop.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{prop.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{prop.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── MODE B: Audio/Effects clip ─────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
                <div>
                  <label style={labelStyle}>Clip Name</label>
                  <div style={fieldStyle}>{selectedClip.label}</div>
                </div>
                {[
                  { label: 'Duration', value: `${formatTimecode(selectedClip.durationSec)} (${selectedClip.durationSec}s)` },
                  { label: 'Start Time', value: formatTimecode(selectedClip.startSec) },
                  { label: 'End Time', value: formatTimecode(selectedClip.startSec + selectedClip.durationSec) },
                  { label: 'Layer', value: tracks.find((t) => t.clips.some((c) => c.id === selectedClip.id))?.name ?? '---' },
                  { label: 'Opacity', value: '100%' },
                  { label: 'Volume', value: tracks.find((t) => t.clips.some((c) => c.id === selectedClip.id))?.id === 'audio' ? '85%' : 'N/A' },
                  { label: 'Blend Mode', value: 'Normal' },
                ].map((prop) => (
                  <div key={prop.label}>
                    <label style={labelStyle}>{prop.label}</label>
                    <div style={fieldStyle}>{prop.value}</div>
                  </div>
                ))}
                {/* Color indicator */}
                <div>
                  <label style={labelStyle}>Clip Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: selectedClip.color, border: '1px solid var(--border)',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {selectedClip.color}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Takes Drawer (slides over Properties panel) ── */}
          <TakesDrawer
            open={takesDrawerOpen}
            onClose={() => setTakesDrawerOpen(false)}
            shotNumber={selectedClip?.shotNumber ?? 1}
            takes={mockTakes}
            onSelectTake={handleSelectTake}
            onGenerateNewTake={handleGenerateNewTake}
          />
        </div>
      </div>
    </>
    </ErrorBoundary>
  );
}
