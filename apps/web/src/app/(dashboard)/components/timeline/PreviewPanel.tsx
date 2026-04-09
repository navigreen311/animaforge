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
  ChevronsUpDown,
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
    thumbnailUrl?: string;
  };
  onGenerate?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXPANDED_HEIGHT = 200;
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
  onGenerate,
}: {
  selectedShot?: PreviewPanelProps['selectedShot'];
  onGenerate?: () => void;
}) {
  /* No shot selected — dark bg with "AF" watermark */
  if (!selectedShot) {
    return (
      <div
        style={{
          flex: 1,
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: '#0a0a0f',
          borderRadius: 'var(--radius-md, 6px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* AF watermark */}
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.04)',
            userSelect: 'none',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
          }}
        >
          AF
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            userSelect: 'none',
            zIndex: 1,
          }}
        >
          No content at this position
        </span>
      </div>
    );
  }

  /* Shot exists but not yet generated — gradient bg + shot name */
  if (selectedShot.status !== 'generated' && selectedShot.status !== 'approved') {
    return (
      <div
        style={{
          flex: 1,
          aspectRatio: '16 / 9',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: 'var(--radius-md, 6px)',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
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
          onClick={onGenerate}
          style={{
            marginTop: 4,
            padding: '4px 14px',
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

  /* Shot generated — show thumbnail image placeholder */
  return (
    <div
      style={{
        flex: 1,
        aspectRatio: '16 / 9',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: selectedShot.thumbnailUrl
          ? `url(${selectedShot.thumbnailUrl}) center/cover no-repeat`
          : 'var(--bg-surface)',
        borderRadius: 'var(--radius-md, 6px)',
        border: '1px solid var(--border)',
      }}
    >
      {!selectedShot.thumbnailUrl && (
        <>
          <Film size={20} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
            }}
          >
            Generated Frame Preview
          </span>
        </>
      )}
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
  onGenerate,
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
        {/* Left side: Preview label + timecode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Play size={9} strokeWidth={2.5} />
            Preview
          </span>

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
        </div>

        {/* Expand button */}
        <button
          type="button"
          aria-label="Expand preview panel"
          onClick={onToggleCollapse}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            height: 18,
            padding: '0 6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm, 4px)',
            transition: 'color 120ms',
            fontSize: 10,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <ChevronsUpDown size={11} strokeWidth={2} />
          Expand
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
      {/* Preview area: left = 16:9 frame, right = transport controls */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 10,
          padding: '8px 10px 0 10px',
        }}
      >
        {/* Left: 16:9 preview frame */}
        <PreviewContent selectedShot={selectedShot} onGenerate={onGenerate} />

        {/* Right: vertical transport controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minWidth: 28,
          }}
        >
          <TransportButton label="Skip back" onClick={() => {}}>
            <SkipBack size={14} strokeWidth={1.8} />
          </TransportButton>

          <TransportButton
            label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? (
              <Pause size={14} strokeWidth={1.8} />
            ) : (
              <Play size={14} strokeWidth={1.8} />
            )}
          </TransportButton>

          <TransportButton label="Skip forward" onClick={() => {}}>
            <SkipForward size={14} strokeWidth={1.8} />
          </TransportButton>

          <TransportButton label="Fullscreen" onClick={() => {}}>
            <Maximize2 size={14} strokeWidth={1.8} />
          </TransportButton>
        </div>
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center"
        style={{
          height: CONTROLS_HEIGHT,
          minHeight: CONTROLS_HEIGHT,
          padding: '0 10px',
          background: 'var(--bg-elevated)',
          borderTop: '0.5px solid var(--border)',
        }}
      >
        {/* Timecode display */}
        <span
          style={{
            flex: 1,
            fontSize: 10,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--text-secondary)',
            userSelect: 'none',
          }}
        >
          {currentTimecode} / {totalDuration}
        </span>

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
