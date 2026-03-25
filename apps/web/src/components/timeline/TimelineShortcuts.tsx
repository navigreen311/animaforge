'use client';

import { useEffect, useState, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineShortcutsProps {
  playing: boolean;
  onPlayPause: () => void;
  playheadPosition: number;
  onPlayheadChange: (position: number) => void;
  totalDuration: number;
  frameRate: number;
  selectedShotIds: string[];
  onDeleteShots?: (ids: string[]) => void;
  onDuplicateShot?: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { key: 'Space', label: 'Space', description: 'Play / Pause' },
  { key: 'ArrowLeft', label: '\u2190', description: 'Move playhead back 1 frame' },
  { key: 'ArrowRight', label: '\u2192', description: 'Move playhead forward 1 frame' },
  { key: 'Home', label: 'Home', description: 'Go to start' },
  { key: 'End', label: 'End', description: 'Go to end' },
  { key: 'Delete', label: 'Del', description: 'Delete selected shots' },
  { key: 'Ctrl+Z', label: 'Ctrl+Z', description: 'Undo' },
  { key: 'Ctrl+Shift+Z', label: 'Ctrl+Shift+Z', description: 'Redo' },
  { key: 'Ctrl+D', label: 'Ctrl+D', description: 'Duplicate selected shot' },
  { key: '+', label: '+', description: 'Zoom in' },
  { key: '-', label: '-', description: 'Zoom out' },
  { key: '?', label: '?', description: 'Toggle shortcut hints' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineShortcuts({
  playing,
  onPlayPause,
  playheadPosition,
  onPlayheadChange,
  totalDuration,
  frameRate,
  selectedShotIds,
  onDeleteShots,
  onDuplicateShot,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
}: TimelineShortcutsProps) {
  const [showHints, setShowHints] = useState(false);
  const frameDuration = 1 / frameRate;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPlayheadChange(Math.max(0, playheadPosition - frameDuration));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onPlayheadChange(Math.min(totalDuration, playheadPosition + frameDuration));
          break;
        case 'Home':
          e.preventDefault();
          onPlayheadChange(0);
          break;
        case 'End':
          e.preventDefault();
          onPlayheadChange(totalDuration);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedShotIds.length > 0 && onDeleteShots) {
            e.preventDefault();
            onDeleteShots(selectedShotIds);
          }
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) { onRedo?.(); }
            else { onUndo?.(); }
          }
          break;
        case 'd':
        case 'D':
          if ((e.ctrlKey || e.metaKey) && selectedShotIds.length === 1 && onDuplicateShot) {
            e.preventDefault();
            onDuplicateShot(selectedShotIds[0]);
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          onZoomChange(Math.min(400, zoom + 10));
          break;
        case '-':
        case '_':
          e.preventDefault();
          onZoomChange(Math.max(25, zoom - 10));
          break;
        case '?':
          setShowHints((prev) => !prev);
          break;
      }
    },
    [
      playing, onPlayPause, playheadPosition, onPlayheadChange,
      totalDuration, frameDuration, selectedShotIds, onDeleteShots,
      onDuplicateShot, onUndo, onRedo, zoom, onZoomChange,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!showHints) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h4>
        <button
          onClick={() => setShowHints(false)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-3">
            <kbd className="inline-flex min-w-[60px] items-center justify-center rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
              {shortcut.label}
            </kbd>
            <span className="text-xs text-zinc-400">{shortcut.description}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-zinc-500">
        Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">?</kbd> to toggle
      </p>
    </div>
  );
}
