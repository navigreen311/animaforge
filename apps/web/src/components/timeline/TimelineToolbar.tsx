'use client';

import type { ToolMode } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SnapMode = 'none' | 'grid' | 'shot' | 'keyframe';
export type FrameRate = 24 | 30 | 60;

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
  snapMode?: SnapMode;
  onSnapModeChange?: (mode: SnapMode) => void;
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onAddShot: () => void;
  frameRate?: FrameRate;
  onFrameRateChange?: (fps: FrameRate) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onExportTimeline?: () => void;
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
  snapMode = 'grid',
  onSnapModeChange,
  mode,
  onModeChange,
  onAddShot,
  frameRate = 24,
  onFrameRateChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onExportTimeline,
}: TimelineToolbarProps) {
  const modeButtons: { value: ToolMode; label: string }[] = [
    { value: 'select', label: 'Select' },
    { value: 'trim', label: 'Trim' },
    { value: 'split', label: 'Split' },
  ];

  const frameRates: FrameRate[] = [24, 30, 60];
  const snapModes: { value: SnapMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'grid', label: 'Grid' },
    { value: 'shot', label: 'Shot' },
    { value: 'keyframe', label: 'Keyframe' },
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
        className={'rounded px-3 py-1 text-xs font-medium ' + (
          snap
            ? 'bg-violet-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        )}
      >
        Snap
      </button>

      {/* Snap mode dropdown (none/grid/shot/keyframe) */}
      {snap && onSnapModeChange && (
        <select
          value={snapMode}
          onChange={(e) => onSnapModeChange(e.target.value as SnapMode)}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          {snapModes.map((sm) => (
            <option key={sm.value} value={sm.value}>{sm.label}</option>
          ))}
        </select>
      )}

      {/* Mode buttons */}
      <div className="flex gap-1">
        {modeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onModeChange(btn.value)}
            className={'rounded px-3 py-1 text-xs font-medium ' + (
              mode === btn.value
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-zinc-700" />

      {/* Frame rate selector (24/30/60fps) */}
      {onFrameRateChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">FPS</span>
          <select
            value={frameRate}
            onChange={(e) => onFrameRateChange(Number(e.target.value) as FrameRate)}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            {frameRates.map((fps) => (
              <option key={fps} value={fps}>{fps}</option>
            ))}
          </select>
        </div>
      )}

      {/* Undo / Redo buttons */}
      <div className="flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8h8a3 3 0 0 1 0 6H9" />
            <path d="M5 5L2 8l3 3" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800"
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 8H5a3 3 0 0 0 0 6h2" />
            <path d="M11 5l3 3-3 3" />
          </svg>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export timeline button */}
      {onExportTimeline && (
        <button
          onClick={onExportTimeline}
          className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
        >
          Export
        </button>
      )}

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
