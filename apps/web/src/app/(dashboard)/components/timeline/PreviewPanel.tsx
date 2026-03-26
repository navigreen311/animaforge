'use client';

import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Film,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PreviewPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentTimecode: string;
  totalDuration: string;
  selectedShot?: {
    name: string;
    status: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXPANDED_HEIGHT = 180;
const COLLAPSED_HEIGHT = 24;
const CONTROLS_HEIGHT = 32;

/* ------------------------------------------------------------------ */
/*  Transport button                                                   */
/* ------------------------------------------------------------------ */

function TransportButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        background: 'none',
        border: 'none',
        borderRadius: 'var(--radius-sm, 4px)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'color 120ms, background 120ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.background = 'var(--bg-overlay, rgba(255,255,255,0.06))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.background = 'none';
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview content (conditional on shot state)                        */
/* ------------------------------------------------------------------ */

function PreviewContent({
  selectedShot,
}: {
  selectedShot?: PreviewPanelProps['selectedShot'];
}) {
  /* No shot selected */
  if (!selectedShot) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md, 6px)',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--text-tertiary)',
            userSelect: 'none',
          }}
        >
          AnimaForge
        </span>
      </div>
    );
  }

  /* Shot exists but not yet generated */
  if (selectedShot.status !== 'generated') {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-[6px]"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md, 6px)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {selectedShot.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
          }}
        >
          Not generated yet
        </span>
        <button
          type="button"
          style={{
            marginTop: 4,
            padding: '3px 12px',
            fontSize: 10,
            fontWeight: 600,
            color: '#fff',
            background: 'var(--brand)',
            border: 'none',
            borderRadius: 'var(--radius-sm, 4px)',
            cursor: 'pointer',
            transition: 'opacity 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Generate
        </button>
      </div>
    );
  }

  /* Shot generated — show placeholder frame */
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-[4px]"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md, 6px)',
      }}
    >
      <Film size={20} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
        }}
      >
        Generated Frame Preview
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function PreviewPanel({
  isCollapsed,
  onToggleCollapse,
  currentTimecode,
  totalDuration,
  selectedShot,
}: PreviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  /* ------ Collapsed strip ------ */
  if (isCollapsed) {
    return (
      <div
        className="flex items-center justify-between"
        style={{
          height: COLLAPSED_HEIGHT,
          minHeight: COLLAPSED_HEIGHT,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          borderBottom: '0.5px solid var(--border)',
          padding: '0 10px',
          transition: 'height 200ms ease',
        }}
      >
        {/* Timecode */}
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--text-tertiary)',
            userSelect: 'none',
          }}
        >
          {currentTimecode} / {totalDuration}
        </span>

        {/* Expand button */}
        <button
          type="button"
          aria-label="Expand preview panel"
          onClick={onToggleCollapse}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm, 4px)',
            transition: 'color 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <ChevronUp size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  /* ------ Expanded panel ------ */
  return (
    <div
      className="flex flex-col"
      style={{
        height: EXPANDED_HEIGHT,
        minHeight: EXPANDED_HEIGHT,
        overflow: 'hidden',
        background: 'var(--bg-elevated)',
        borderBottom: '0.5px solid var(--border)',
        transition: 'height 200ms ease',
      }}
    >
      {/* Preview area */}
      <div
        className="flex"
        style={{
          flex: 1,
          minHeight: 0,
          padding: '6px 10px 0 10px',
        }}
      >
        <PreviewContent selectedShot={selectedShot} />
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center gap-[4px]"
        style={{
          height: CONTROLS_HEIGHT,
          minHeight: CONTROLS_HEIGHT,
          padding: '0 10px',
          background: 'var(--bg-elevated)',
          borderTop: '0.5px solid var(--border)',
        }}
      >
        {/* Transport controls */}
        <TransportButton label="Skip back" onClick={() => {}}>
          <SkipBack size={16} strokeWidth={1.8} />
        </TransportButton>

        <TransportButton
          label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? (
            <Pause size={16} strokeWidth={1.8} />
          ) : (
            <Play size={16} strokeWidth={1.8} />
          )}
        </TransportButton>

        <TransportButton label="Skip forward" onClick={() => {}}>
          <SkipForward size={16} strokeWidth={1.8} />
        </TransportButton>

        {/* Timecode display */}
        <span
          className="flex-1"
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--text-secondary)',
            marginLeft: 6,
            userSelect: 'none',
          }}
        >
          {currentTimecode} / {totalDuration}
        </span>

        {/* Fullscreen */}
        <TransportButton label="Fullscreen" onClick={() => {}}>
          <Maximize2 size={16} strokeWidth={1.8} />
        </TransportButton>

        {/* Collapse button */}
        <button
          type="button"
          aria-label="Collapse preview panel"
          onClick={onToggleCollapse}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm, 4px)',
            transition: 'color 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default PreviewPanel;
