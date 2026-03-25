'use client';

import { useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Keyframe {
  id: string;
  timeSec: number;
  type: 'camera' | 'motion';
  properties: Record<string, number | string>;
}

export interface KeyframeTrackProps {
  keyframes: Keyframe[];
  scale: number;
  scrollX: number;
  playheadPosition: number;
  onAddKeyframe?: (timeSec: number) => void;
  onMoveKeyframe?: (id: string, newTimeSec: number) => void;
  onEditKeyframe?: (id: string) => void;
  onDeleteKeyframe?: (id: string) => void;
}

const TRACK_HEIGHT = 32;
const DIAMOND_SIZE = 10;
const TRACK_LABEL_WIDTH = 112;

const TYPE_COLORS: Record<string, string> = {
  camera: '#f59e0b',
  motion: '#3b82f6',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function KeyframeTrack({
  keyframes,
  scale,
  scrollX,
  playheadPosition,
  onAddKeyframe,
  onMoveKeyframe,
  onEditKeyframe,
}: KeyframeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Click on track to add keyframe at playhead position */
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.keyframeId) return;
      if (onAddKeyframe) onAddKeyframe(playheadPosition);
    },
    [playheadPosition, onAddKeyframe],
  );

  /* Drag to move keyframe */
  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDraggingId(id);
      setSelectedId(id);
      const onMouseMove = (moveE: MouseEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = moveE.clientX - rect.left;
        const timeSec = Math.max(0, (x + scrollX - TRACK_LABEL_WIDTH) / scale);
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
    [scrollX, scale, onMoveKeyframe],
  );

  /* Double-click to edit keyframe properties */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onEditKeyframe?.(id);
    },
    [onEditKeyframe],
  );

  return (
    <div
      ref={trackRef}
      className="relative flex items-stretch border-b border-zinc-800"
      style={{ height: TRACK_HEIGHT }}
      onClick={handleTrackClick}
    >
      <div
        className="flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-400"
        style={{ width: TRACK_LABEL_WIDTH }}
      >
        Keyframes
      </div>
      <div className="relative flex-1 bg-zinc-950/50">
        {keyframes.map((kf) => {
          const x = kf.timeSec * scale - scrollX;
          const isSelected = kf.id === selectedId;
          const isDragging = kf.id === draggingId;
          const color = TYPE_COLORS[kf.type] || TYPE_COLORS.camera;
          return (
            <div
              key={kf.id}
              data-keyframe-id={kf.id}
              className={'absolute cursor-grab select-none'
                + (isDragging ? ' cursor-grabbing opacity-70' : '')
                + (isSelected ? ' z-10' : '')}
              style={{
                left: x - DIAMOND_SIZE / 2,
                top: (TRACK_HEIGHT - DIAMOND_SIZE) / 2 - DIAMOND_SIZE / 2,
                width: DIAMOND_SIZE,
                height: DIAMOND_SIZE,
                transform: 'rotate(45deg)',
                backgroundColor: color,
                border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                boxShadow: isSelected ? '0 0 8px ' + color : 'none',
              }}
              onMouseDown={(e) => handleDragStart(e, kf.id)}
              onDoubleClick={(e) => handleDoubleClick(e, kf.id)}
              title={kf.type + ' @ ' + kf.timeSec + 's'}
            />
          );
        })}
      </div>
    </div>
  );
}
