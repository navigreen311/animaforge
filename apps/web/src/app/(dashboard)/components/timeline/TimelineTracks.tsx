'use client';

import { useState } from 'react';
import { CameraTrack } from '@/components/timeline/CameraTrack';
import { KeyframeTrack } from '@/components/timeline/KeyframeTrack';

// ── Types ──────────────────────────────────────────────────────
interface Clip {
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
  color: string;
}

interface TimelineTracksProps {
  selectedClip: Clip | null;
  onSelectClip: (clip: Clip) => void;
  playheadPosition: number; // percentage 0–100
}

// ── Mock Data ──────────────────────────────────────────────────

type ShotStatus = 'approved' | 'generating' | 'draft';

interface ShotBlock {
  id: string;
  label: string;
  leftPct: number;
  widthPct: number;
  status: ShotStatus;
}

const VIDEO_SHOTS: ShotBlock[] = [
  { id: 'shot-1', label: 'Shot 1 - Intro', leftPct: 0, widthPct: 26, status: 'approved' },
  { id: 'shot-2', label: 'Shot 2 - Battle', leftPct: 29, widthPct: 37, status: 'generating' },
  { id: 'shot-3', label: 'Shot 3 - Epilogue', leftPct: 69, widthPct: 27, status: 'draft' },
];

interface AudioBlock {
  id: string;
  label: string;
  leftPct: number;
  widthPct: number;
}

const AUDIO_BLOCKS: AudioBlock[] = [
  { id: 'aud-1', label: 'Background Music', leftPct: 0, widthPct: 60 },
  { id: 'aud-2', label: 'Dialogue Track', leftPct: 63, widthPct: 34 },
];

interface EffectBlock {
  id: string;
  label: string;
  leftPct: number;
  widthPct: number;
}

const EFFECT_BLOCKS: EffectBlock[] = [
  { id: 'fx-1', label: 'SFX - Explosion', leftPct: 30, widthPct: 15 },
  { id: 'fx-2', label: 'Transition - Fade', leftPct: 67, widthPct: 12 },
];

interface CommentMarker {
  id: string;
  positionPct: number;
  color: string;
  text: string;
}

const COMMENT_MARKERS: CommentMarker[] = [
  { id: 'mk-1', positionPct: 15, color: '#eab308', text: 'Note: Check pacing on intro' },
  { id: 'mk-2', positionPct: 48, color: '#ef4444', text: 'Issue: Battle lighting too dark' },
  { id: 'mk-3', positionPct: 82, color: '#22c55e', text: 'Approved: Epilogue looks great' },
];

// ── Shared Styles ──────────────────────────────────────────────

const TRACK_HEIGHT = 40;
const LABEL_WIDTH = 60;

const trackRowStyle: React.CSSProperties = {
  display: 'flex',
  height: TRACK_HEIGHT,
  borderBottom: '1px solid var(--border)',
};

const labelStyle: React.CSSProperties = {
  width: LABEL_WIDTH,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: 8,
  fontSize: 10,
  color: 'var(--text-tertiary)',
  fontWeight: 500,
  userSelect: 'none',
  borderRight: '1px solid var(--border)',
  background: 'var(--bg-surface)',
};

const laneStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};

const blockBaseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  bottom: 4,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  padding: '0 6px',
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  fontSize: 10,
  fontWeight: 500,
  color: '#fff',
  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
  transition: 'opacity 120ms ease, filter 120ms ease',
};

// ── Pulse keyframes (injected once) ────────────────────────────

const PULSE_CSS = `
@keyframes shot-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}
.shot-generating {
  animation: shot-pulse 2s ease-in-out infinite;
}
`;

// ── Component ──────────────────────────────────────────────────

export default function TimelineTracks({
  selectedClip,
  onSelectClip,
  playheadPosition,
}: TimelineTracksProps) {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const handleMarkerClick = (id: string) => {
    setActivePopover((prev) => (prev === id ? null : id));
  };

  const isSelected = (id: string) => selectedClip?.id === id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Inject pulse animation */}
      <style>{PULSE_CSS}</style>

      {/* ── 1. Markers Strip ────────────────────────────────── */}
      <div style={{ ...trackRowStyle, height: 24 }}>
        <div style={{ ...labelStyle, height: 24 }}>Markers</div>
        <div style={{ ...laneStyle, background: 'rgba(0,0,0,0.02)' }}>
          {COMMENT_MARKERS.map((marker) => (
            <div
              key={marker.id}
              onClick={() => handleMarkerClick(marker.id)}
              style={{
                position: 'absolute',
                left: `${marker.positionPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Flag icon */}
              <svg
                width="12"
                height="14"
                viewBox="0 0 12 14"
                fill="none"
                style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}
              >
                <rect x="1" y="0" width="1.5" height="14" rx="0.5" fill={marker.color} />
                <path d="M2.5 1 L11 3.5 L2.5 6.5 Z" fill={marker.color} />
              </svg>

              {/* Popover */}
              {activePopover === marker.id && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 6,
                    padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 50,
                    pointerEvents: 'auto',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: marker.color,
                      marginRight: 6,
                      verticalAlign: 'middle',
                    }}
                  />
                  {marker.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Video Track ──────────────────────────────────── */}
      <div style={trackRowStyle}>
        <div style={labelStyle}>Video</div>
        <div style={laneStyle}>
          {/* Playhead line */}
          <div
            style={{
              position: 'absolute',
              left: `${playheadPosition}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(239,68,68,0.5)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />

          {VIDEO_SHOTS.map((shot) => {
            const selected = isSelected(shot.id);
            let borderStyle: string;
            let borderColor: string;
            let bgColor: string;
            let icon: React.ReactNode = null;
            let extraClassName = '';

            switch (shot.status) {
              case 'approved':
                borderStyle = '2px solid var(--status-complete-text)';
                borderColor = 'var(--status-complete-text)';
                bgColor = 'rgba(110,231,183,0.12)';
                icon = (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    style={{ marginRight: 4, flexShrink: 0 }}
                  >
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="var(--status-complete-text)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                );
                break;
              case 'generating':
                borderStyle = '2px solid var(--brand)';
                borderColor = 'var(--brand)';
                bgColor = 'var(--brand-dim)';
                extraClassName = 'shot-generating';
                break;
              case 'draft':
              default:
                borderStyle = '2px dashed var(--border)';
                borderColor = 'var(--border)';
                bgColor = 'rgba(255,255,255,0.03)';
                break;
            }

            return (
              <div
                key={shot.id}
                className={extraClassName || undefined}
                onClick={() =>
                  onSelectClip({
                    id: shot.id,
                    label: shot.label,
                    startSec: 0,
                    durationSec: 0,
                    color: borderColor,
                  })
                }
                style={{
                  ...blockBaseStyle,
                  left: `${shot.leftPct}%`,
                  width: `${shot.widthPct}%`,
                  background: bgColor,
                  border: borderStyle,
                  color: 'var(--text-primary)',
                  textShadow: 'none',
                  boxShadow: selected ? `0 0 0 1px var(--brand)` : 'none',
                  opacity: selected ? 1 : 0.9,
                }}
              >
                {icon}
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {shot.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Camera Track ─────────────────────────────────── */}
      <CameraTrack
        playheadPosition={playheadPosition}
        selectedId={selectedClip?.id ?? null}
        onSelectMove={(move) =>
          onSelectClip({
            id: move.id,
            label: move.label,
            startSec: 0,
            durationSec: 0,
            color: '#4f46e5',
          })
        }
      />

      {/* ── 4. Keyframe Track ───────────────────────────────── */}
      <KeyframeTrack playheadPosition={playheadPosition} />

      {/* ── 5. Audio Track ──────────────────────────────────── */}
      <div style={trackRowStyle}>
        <div style={labelStyle}>Audio</div>
        <div style={laneStyle}>
          <div
            style={{
              position: 'absolute',
              left: `${playheadPosition}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(239,68,68,0.5)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />

          {AUDIO_BLOCKS.map((block) => {
            const selected = isSelected(block.id);
            return (
              <div
                key={block.id}
                onClick={() =>
                  onSelectClip({
                    id: block.id,
                    label: block.label,
                    startSec: 0,
                    durationSec: 0,
                    color: '#0891b2',
                  })
                }
                style={{
                  ...blockBaseStyle,
                  left: `${block.leftPct}%`,
                  width: `${block.widthPct}%`,
                  background: '#0891b2',
                  border: selected ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: selected ? '0 0 0 1px var(--brand)' : 'none',
                  opacity: selected ? 1 : 0.85,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {block.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Effects Track ────────────────────────────────── */}
      <div style={trackRowStyle}>
        <div style={labelStyle}>Effects</div>
        <div style={laneStyle}>
          <div
            style={{
              position: 'absolute',
              left: `${playheadPosition}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(239,68,68,0.5)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />

          {EFFECT_BLOCKS.map((block) => {
            const selected = isSelected(block.id);
            return (
              <div
                key={block.id}
                onClick={() =>
                  onSelectClip({
                    id: block.id,
                    label: block.label,
                    startSec: 0,
                    durationSec: 0,
                    color: '#ea580c',
                  })
                }
                style={{
                  ...blockBaseStyle,
                  left: `${block.leftPct}%`,
                  width: `${block.widthPct}%`,
                  background: '#ea580c',
                  border: selected ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: selected ? '0 0 0 1px var(--brand)' : 'none',
                  opacity: selected ? 1 : 0.85,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {block.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
