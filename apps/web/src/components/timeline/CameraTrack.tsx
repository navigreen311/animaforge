'use client';

import { useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CameraMove {
  id: string;
  label: string;
  motionType: 'Dolly In' | 'Dolly Out' | 'Pan L' | 'Pan R' | 'Tilt Up' | 'Tilt Down' | 'Static' | string;
  leftPct: number;
  widthPct: number;
  properties?: string;
}

export interface CameraTrackProps {
  moves?: CameraMove[];
  playheadPosition?: number;
  selectedId?: string | null;
  onSelectMove?: (move: CameraMove) => void;
  onAddMove?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_MOVES: CameraMove[] = [
  { id: 'cam-1', label: 'Dolly In', motionType: 'Dolly In', leftPct: 2, widthPct: 20, properties: 'Speed: 1.2x | Ease: Cubic In-Out | Distance: 4m' },
  { id: 'cam-2', label: 'Pan R', motionType: 'Pan R', leftPct: 30, widthPct: 25, properties: 'Speed: 0.8x | Angle: 90deg | Pivot: Center' },
  { id: 'cam-3', label: 'Static', motionType: 'Static', leftPct: 70, widthPct: 24, properties: 'Locked | FOV: 50mm | No Motion' },
];

const TRACK_HEIGHT = 36;
const LABEL_WIDTH = 60;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CameraTrack({
  moves = DEFAULT_MOVES,
  playheadPosition = 0,
  selectedId = null,
  onSelectMove,
  onAddMove,
}: CameraTrackProps) {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const handleClick = useCallback(
    (move: CameraMove) => {
      setActivePopover((prev) => (prev === move.id ? null : move.id));
      console.log('[CameraTrack] Selected camera move:', move.id, move.motionType);
      onSelectMove?.(move);
    },
    [onSelectMove],
  );

  const handleAddMove = useCallback(() => {
    console.log('[CameraTrack] Add new camera move');
    onAddMove?.();
  }, [onAddMove]);

  return (
    <div
      style={{
        display: 'flex',
        height: TRACK_HEIGHT,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Track label with [+] button */}
      <div
        style={{
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
          gap: 4,
        }}
      >
        <button
          onClick={handleAddMove}
          title="Add camera move"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            borderRadius: 3,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 11,
            lineHeight: 1,
            padding: 0,
          }}
        >
          +
        </button>
        Camera
      </div>

      {/* Lane */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(99,102,241,0.06)',
        }}
      >
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

        {/* Camera blocks */}
        {moves.map((move) => {
          const selected = move.id === selectedId;
          return (
            <div
              key={move.id}
              style={{
                position: 'absolute',
                left: `${move.leftPct}%`,
                width: `${move.widthPct}%`,
                top: 0,
                bottom: 0,
              }}
            >
              <div
                onClick={() => handleClick(move)}
                style={{
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  left: 0,
                  width: '100%',
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
                  background: '#4f46e5',
                  border: selected ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: selected ? '0 0 0 1px var(--brand)' : 'none',
                  opacity: selected ? 1 : 0.85,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {move.motionType}
                </span>
              </div>

              {/* Properties popover */}
              {activePopover === move.id && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 6,
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 50,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#4f46e5' }}>
                    {move.label}
                  </div>
                  {move.properties && (
                    <div style={{ color: 'var(--text-secondary)' }}>{move.properties}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
