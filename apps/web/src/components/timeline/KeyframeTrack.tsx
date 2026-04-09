'use client';

import { useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Keyframe {
  id: string;
  timeSec: number;
  type: 'camera' | 'motion' | string;
  properties: Record<string, number | string>;
}

export interface KeyframeMarker {
  id: string;
  positionPct: number;
  type: string;
}

export interface KeyframeTrackProps {
  /** Full keyframe data (used in scale/scroll mode) */
  keyframes?: Keyframe[];
  /** Percentage-based markers (used in percentage layout mode) */
  markers?: KeyframeMarker[];
  scale?: number;
  scrollX?: number;
  playheadPosition?: number;
  onAddKeyframe?: (timeSec: number) => void;
  onMoveKeyframe?: (id: string, newTimeSec: number) => void;
  onEditKeyframe?: (id: string) => void;
  onDeleteKeyframe?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_MARKERS: KeyframeMarker[] = [
  { id: 'kf-1', positionPct: 8, type: 'Position' },
  { id: 'kf-2', positionPct: 32, type: 'Rotation' },
  { id: 'kf-3', positionPct: 48, type: 'Scale' },
  { id: 'kf-4', positionPct: 58, type: 'Opacity' },
  { id: 'kf-5', positionPct: 85, type: 'Position' },
];

const TRACK_HEIGHT = 28;
const DIAMOND_SIZE = 12;
const LABEL_WIDTH_INLINE = 60;
const LABEL_WIDTH_STANDALONE = 112;

const TYPE_COLORS: Record<string, string> = {
  camera: '#f59e0b',
  motion: '#3b82f6',
  Position: '#f59e0b',
  Rotation: '#f59e0b',
  Scale: '#f59e0b',
  Opacity: '#f59e0b',
};

const DEFAULT_COLOR = '#f59e0b';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function KeyframeTrack({
  keyframes,
  markers = DEFAULT_MARKERS,
  scale,
  scrollX = 0,
  playheadPosition = 0,
  onAddKeyframe,
  onMoveKeyframe,
  onEditKeyframe,
  onDeleteKeyframe,
}: KeyframeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  /* ---- Scale/scroll mode (used by TimelineViewport) ---- */
  const isScaleMode = keyframes != null && scale != null;

  /* Click on empty area to add keyframe */
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.keyframeId) return;
      // Prevent if clicked on a diamond child
      if ((e.target as HTMLElement).closest('[data-keyframe-id]')) return;

      if (isScaleMode) {
        if (onAddKeyframe) onAddKeyframe(playheadPosition);
      } else {
        // Percentage mode: calculate pct from click position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.round((x / rect.width) * 100);
        console.log('[KeyframeTrack] Add keyframe at', pct, '%');
        onAddKeyframe?.(pct);
      }
    },
    [playheadPosition, onAddKeyframe, isScaleMode],
  );

  /* Click diamond */
  const handleDiamondClick = useCallback(
    (e: React.MouseEvent, id: string, type: string) => {
      e.stopPropagation();
      setSelectedId((prev) => (prev === id ? null : id));
      setActivePopover((prev) => (prev === id ? null : id));
      console.log('[KeyframeTrack] Selected keyframe:', id, type);
    },
    [],
  );

  /* Drag to move keyframe (scale mode only) */
  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (!isScaleMode) return;
      e.stopPropagation();
      setDraggingId(id);
      setSelectedId(id);
      const labelWidth = LABEL_WIDTH_STANDALONE;
      const onMouseMove = (moveE: MouseEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = moveE.clientX - rect.left;
        const timeSec = Math.max(0, (x + scrollX - labelWidth) / scale!);
        onMoveKeyframe?.(id, Math.round(timeSec * 10) / 10);
      };
      const onMouseUp = () => {
        setDraggingId(null);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [scrollX, scale, onMoveKeyframe, isScaleMode],
  );

  /* Double-click to edit */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onEditKeyframe?.(id);
    },
    [onEditKeyframe],
  );

  /* ---- Scale/scroll mode rendering ---- */
  if (isScaleMode) {
    return (
      <div
        ref={trackRef}
        className="relative flex items-stretch border-b border-zinc-800"
        style={{ height: TRACK_HEIGHT }}
        onClick={handleTrackClick}
      >
        <div
          className="flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-400"
          style={{ width: LABEL_WIDTH_STANDALONE }}
        >
          Keyframes
        </div>
        <div className="relative flex-1" style={{ background: 'rgba(245,158,11,0.04)' }}>
          {keyframes!.map((kf) => {
            const x = kf.timeSec * scale! - scrollX;
            const isSelected = kf.id === selectedId;
            const isDragging = kf.id === draggingId;
            const color = TYPE_COLORS[kf.type] || DEFAULT_COLOR;
            return (
              <div
                key={kf.id}
                data-keyframe-id={kf.id}
                className={
                  'absolute cursor-grab select-none'
                  + (isDragging ? ' cursor-grabbing opacity-70' : '')
                  + (isSelected ? ' z-10' : '')
                }
                style={{
                  left: x - DIAMOND_SIZE / 2,
                  top: (TRACK_HEIGHT - DIAMOND_SIZE) / 2,
                  width: DIAMOND_SIZE,
                  height: DIAMOND_SIZE,
                  transform: 'rotate(45deg)',
                  backgroundColor: color,
                  border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                  boxShadow: isSelected ? `0 0 8px ${color}` : 'none',
                }}
                onMouseDown={(e) => handleDragStart(e, kf.id)}
                onDoubleClick={(e) => handleDoubleClick(e, kf.id)}
                title={`${kf.type} @ ${kf.timeSec}s`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  /* ---- Percentage mode rendering (inline timeline) ---- */
  return (
    <div
      ref={trackRef}
      style={{
        display: 'flex',
        height: TRACK_HEIGHT,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Track label */}
      <div
        style={{
          width: LABEL_WIDTH_INLINE,
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
        }}
      >
        Keyframes
      </div>

      {/* Lane */}
      <div
        onClick={handleTrackClick}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(245,158,11,0.04)',
          cursor: 'crosshair',
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

        {/* Diamond markers */}
        {markers.map((kf) => {
          const isSelected = kf.id === selectedId;
          return (
            <div
              key={kf.id}
              data-keyframe-id={kf.id}
              style={{
                position: 'absolute',
                left: `${kf.positionPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 12x12 amber diamond via CSS rotate(45deg) */}
              <div
                onClick={(e) => handleDiamondClick(e, kf.id, kf.type)}
                style={{
                  width: DIAMOND_SIZE,
                  height: DIAMOND_SIZE,
                  transform: 'rotate(45deg)',
                  backgroundColor: '#f59e0b',
                  border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                  boxShadow: isSelected
                    ? '0 0 8px #f59e0b'
                    : '0 1px 2px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'box-shadow 120ms ease',
                }}
              />

              {/* Type popover */}
              {activePopover === kf.id && (
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
                  }}
                >
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>Keyframe:</span>{' '}
                  {kf.type}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
