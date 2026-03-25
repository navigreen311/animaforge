'use client';

import type { ToolMode } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineToolbarProps {
  playing: boolean;
  onPlayPause: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  snap: boolean;
  onSnapToggle: () => void;
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onAddShot: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineToolbar({
  playing,
  onPlayPause,
  zoom,
  onZoomChange,
  snap,
  onSnapToggle,
  mode,
  onModeChange,
  onAddShot,
}: TimelineToolbarProps) {
  const modeButtons: { value: ToolMode; label: string }[] = [
    { value: 'select', label: 'Select' },
    { value: 'trim', label: 'Trim' },
    { value: 'split', label: 'Split' },
  ];

  return (
    <div className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" />
            <rect x="9" y="2" width="4" height="12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <polygon points="3,2 14,8 3,14" />
          </svg>
        )}
      </button>

      {/* Zoom slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Zoom</span>
        <input
          type="range"
          min={25}
          max={200}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer accent-violet-500"
        />
        <span className="w-10 text-xs text-zinc-400">{zoom}%</span>
      </div>

      {/* Snap toggle */}
      <button
        onClick={onSnapToggle}
        className={`rounded px-3 py-1 text-xs font-medium ${
          snap
            ? 'bg-violet-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        }`}
      >
        Snap
      </button>

      {/* Mode buttons */}
      <div className="flex gap-1">
        {modeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onModeChange(btn.value)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              mode === btn.value
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add shot */}
      <button
        onClick={onAddShot}
        className="rounded bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500"
      >
        + Add Shot
      </button>
    </div>
  );
}
