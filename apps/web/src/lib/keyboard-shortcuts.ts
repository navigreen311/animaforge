'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */

export interface ShortcutDef {
  keys: string[];          // e.g. ['Ctrl', 'K'] or ['g', 'p'] (chord)
  label: string;
  description: string;
  id: string;
  chord?: boolean;         // two-key chord (g then p within 500ms)
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

export const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  { id: 'search',       keys: ['Ctrl', 'K'],  label: 'Search',              description: 'Open search palette' },
  { id: 'new-project',  keys: ['Ctrl', 'N'],  label: 'New project',         description: 'Create a new project' },
  { id: 'shortcuts',    keys: ['?'],           label: 'Show shortcuts',      description: 'Open keyboard shortcuts modal' },
  { id: 'escape',       keys: ['Esc'],         label: 'Close / Dismiss',     description: 'Close modal or panel' },
];

export const NAV_SHORTCUTS: ShortcutDef[] = [
  { id: 'go-projects',    keys: ['g', 'p'], label: 'Go to Projects',    description: 'Navigate to Projects page',    chord: true },
  { id: 'go-characters',  keys: ['g', 'c'], label: 'Go to Characters',  description: 'Navigate to Characters page',  chord: true },
  { id: 'go-timeline',    keys: ['g', 't'], label: 'Go to Timeline',    description: 'Navigate to Timeline page',    chord: true },
  { id: 'go-assets',      keys: ['g', 'a'], label: 'Go to Assets',      description: 'Navigate to Assets page',      chord: true },
  { id: 'go-settings',    keys: ['g', 's'], label: 'Go to Settings',    description: 'Navigate to Settings page',    chord: true },
];

export const TIMELINE_SHORTCUTS: ShortcutDef[] = [
  { id: 'play-pause',   keys: ['Space'],       label: 'Play / Pause',     description: 'Toggle timeline playback' },
  { id: 'frame-left',   keys: ['ArrowLeft'],    label: 'Previous frame',   description: 'Step one frame backward' },
  { id: 'frame-right',  keys: ['ArrowRight'],   label: 'Next frame',       description: 'Step one frame forward' },
  { id: 'zoom-in',      keys: ['Ctrl', '='],    label: 'Zoom in',          description: 'Zoom into timeline' },
  { id: 'zoom-out',     keys: ['Ctrl', '-'],    label: 'Zoom out',         description: 'Zoom out of timeline' },
];

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  { title: 'Global',     shortcuts: GLOBAL_SHORTCUTS },
  { title: 'Navigation', shortcuts: NAV_SHORTCUTS },
  { title: 'Timeline',   shortcuts: TIMELINE_SHORTCUTS },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Register keyboard shortcuts.
 *
 * `handlers` keys match shortcut `id` values.
 * Supports single keys and g-then-X chords (500 ms window).
 */
export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const chordRef = useRef<{ key: string; time: number } | null>(null);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (isInputFocused()) return;

    const mod = e.metaKey || e.ctrlKey;
    const key = e.key;

    // ── Mod combos ──────────────────────────────────────
    if (mod && key === 'k') { e.preventDefault(); handlersRef.current['search']?.(); return; }
    if (mod && key === 'n') { e.preventDefault(); handlersRef.current['new-project']?.(); return; }
    if (mod && key === '=') { e.preventDefault(); handlersRef.current['zoom-in']?.(); return; }
    if (mod && key === '-') { e.preventDefault(); handlersRef.current['zoom-out']?.(); return; }

    // Don't process further if mod key is held
    if (mod) return;

    // ── Single keys ─────────────────────────────────────
    if (key === '?') { handlersRef.current['shortcuts']?.(); return; }
    if (key === 'Escape') { handlersRef.current['escape']?.(); return; }
    if (key === ' ') {
      if (handlersRef.current['play-pause']) {
        e.preventDefault();
        handlersRef.current['play-pause']();
        return;
      }
    }
    if (key === 'ArrowLeft') { handlersRef.current['frame-left']?.(); return; }
    if (key === 'ArrowRight') { handlersRef.current['frame-right']?.(); return; }

    // ── Chord handling (g → second key) ─────────────────
    const now = Date.now();
    const pending = chordRef.current;

    if (key === 'g') {
      chordRef.current = { key: 'g', time: now };
      return;
    }

    if (pending && pending.key === 'g' && now - pending.time < 500) {
      chordRef.current = null;
      switch (key) {
        case 'p': handlersRef.current['go-projects']?.(); return;
        case 'c': handlersRef.current['go-characters']?.(); return;
        case 't': handlersRef.current['go-timeline']?.(); return;
        case 'a': handlersRef.current['go-assets']?.(); return;
        case 's': handlersRef.current['go-settings']?.(); return;
      }
    }

    // Reset chord if unmatched
    chordRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);
}
