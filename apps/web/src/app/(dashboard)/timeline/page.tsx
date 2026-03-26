'use client';

import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';

// ── Sample Data ──────────────────────────────────────────────
interface Clip {
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
  color: string;
}

interface Track {
  id: string;
  name: string;
  clips: Clip[];
}

const TRACKS: Track[] = [
  {
    id: 'video',
    name: 'Video',
    clips: [
      { id: 'v1', label: 'Shot 1 - Intro', startSec: 0, durationSec: 38, color: '#7c3aed' },
      { id: 'v2', label: 'Shot 2 - Battle Scene', startSec: 42, durationSec: 55, color: '#6d28d9' },
      { id: 'v3', label: 'Shot 3 - Epilogue', startSec: 102, durationSec: 40, color: '#8b5cf6' },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    clips: [
      { id: 'a1', label: 'Background Music', startSec: 0, durationSec: 90, color: '#0891b2' },
      { id: 'a2', label: 'Dialogue Track', startSec: 95, durationSec: 50, color: '#0e7490' },
    ],
  },
  {
    id: 'effects',
    name: 'Effects',
    clips: [
      { id: 'e1', label: 'SFX - Explosion', startSec: 44, durationSec: 12, color: '#c2410c' },
      { id: 'e2', label: 'SFX - Wind', startSec: 70, durationSec: 25, color: '#ea580c' },
      { id: 'e3', label: 'Transition - Fade', startSec: 100, durationSec: 6, color: '#d97706' },
    ],
  },
];

const TOTAL_DURATION_SEC = 225; // 3:45
const TIME_MARKERS = [0, 30, 60, 90, 120, 150, 180, 210];

function formatTimecode(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimecodeHMS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const f = Math.floor((sec % 1) * 24);
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────
export default function TimelinePage() {
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(TRACKS[0].clips[0]);
  const [playheadSec] = useState(84); // 00:01:24

  const timelineWidthPx = 600 + zoom * 8; // scales with zoom

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px 0',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Timeline Editor
        </h1>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            margin: '4px 0 16px',
          }}
        >
          Edit and arrange shots on the timeline
        </p>
      </div>

      {/* ── Playback Controls Bar ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 24px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Transport buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => {}}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipBack size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            style={{
              background: 'var(--brand)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 8,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
            }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
          </button>
          <button
            type="button"
            onClick={() => {}}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* Timecode */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-base)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            letterSpacing: '0.5px',
          }}
        >
          {formatTimecodeHMS(playheadSec)} / 00:03:45
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ZoomOut size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="range"
            min={10}
            max={100}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              width: 100,
              accentColor: 'var(--brand)',
              cursor: 'pointer',
            }}
          />
          <ZoomIn size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 32 }}>
            {zoom}%
          </span>
        </div>
      </div>

      {/* ── Main Content: Timeline + Properties ─────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Timeline Area ────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            background: 'var(--bg-base)',
          }}
        >
          <div style={{ minWidth: timelineWidthPx + 100, padding: '0 0 16px' }}>
            {/* ── Ruler ──────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                height: 32,
                marginLeft: 100,
                borderBottom: '1px solid var(--border)',
                position: 'relative',
              }}
            >
              {TIME_MARKERS.map((sec) => {
                const leftPx = (sec / TOTAL_DURATION_SEC) * timelineWidthPx;
                return (
                  <div
                    key={sec}
                    style={{
                      position: 'absolute',
                      left: leftPx,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        marginBottom: 4,
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatTimecode(sec)}
                    </span>
                    <div
                      style={{
                        width: 1,
                        height: 8,
                        background: 'var(--border)',
                      }}
                    />
                  </div>
                );
              })}

              {/* Playhead on ruler */}
              <div
                style={{
                  position: 'absolute',
                  left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx,
                  bottom: 0,
                  width: 2,
                  height: 14,
                  background: '#ef4444',
                  borderRadius: '1px 1px 0 0',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx - 4,
                  bottom: 10,
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid #ef4444',
                }}
              />
            </div>

            {/* ── Tracks ─────────────────────────────────── */}
            {TRACKS.map((track, trackIdx) => (
              <div
                key={track.id}
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--border)',
                  minHeight: 56,
                }}
              >
                {/* Track label */}
                <div
                  style={{
                    width: 100,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {track.name}
                </div>

                {/* Track lane */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    minWidth: timelineWidthPx,
                    padding: '8px 0',
                  }}
                >
                  {/* Playhead line across track */}
                  <div
                    style={{
                      position: 'absolute',
                      left: (playheadSec / TOTAL_DURATION_SEC) * timelineWidthPx,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: 'rgba(239, 68, 68, 0.5)',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />

                  {track.clips.map((clip) => {
                    const leftPct = (clip.startSec / TOTAL_DURATION_SEC) * 100;
                    const widthPct = (clip.durationSec / TOTAL_DURATION_SEC) * 100;
                    const isSelected = selectedClip?.id === clip.id;

                    return (
                      <div
                        key={clip.id}
                        onClick={() => setSelectedClip(clip)}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: 8,
                          bottom: 8,
                          background: clip.color,
                          borderRadius: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                          boxShadow: isSelected ? '0 0 0 1px var(--brand)' : 'none',
                          opacity: isSelected ? 1 : 0.85,
                          transition: 'opacity 120ms ease, border-color 120ms ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#ffffff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {clip.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Properties Panel ────────────────────────────── */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            Properties
          </h2>

          {selectedClip ? (
            <>
              {/* Clip name */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    display: 'block',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 500,
                  }}
                >
                  Clip Name
                </label>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-elevated)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {selectedClip.label}
                </div>
              </div>

              {/* Properties grid */}
              {[
                {
                  label: 'Duration',
                  value: `${formatTimecode(selectedClip.durationSec)} (${selectedClip.durationSec}s)`,
                },
                {
                  label: 'Start Time',
                  value: formatTimecode(selectedClip.startSec),
                },
                {
                  label: 'End Time',
                  value: formatTimecode(selectedClip.startSec + selectedClip.durationSec),
                },
                {
                  label: 'Layer',
                  value: TRACKS.find((t) => t.clips.some((c) => c.id === selectedClip.id))?.name ?? '---',
                },
                { label: 'Opacity', value: '100%' },
                { label: 'Volume', value: TRACKS.find((t) => t.clips.some((c) => c.id === selectedClip.id))?.id === 'audio' ? '85%' : 'N/A' },
                { label: 'Blend Mode', value: 'Normal' },
              ].map((prop) => (
                <div key={prop.label}>
                  <label
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      display: 'block',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    {prop.label}
                  </label>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-elevated)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {prop.value}
                  </div>
                </div>
              ))}

              {/* Color indicator */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    display: 'block',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 500,
                  }}
                >
                  Clip Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: selectedClip.color,
                      border: '1px solid var(--border)',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {selectedClip.color}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              Select a clip on the timeline to view its properties.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
