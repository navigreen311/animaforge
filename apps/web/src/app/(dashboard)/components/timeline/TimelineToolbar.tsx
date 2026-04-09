'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Magnet,
  Maximize2,
  ZoomOut,
  ZoomIn,
  Plus,
  Music,
  Sparkles,
  Video,
  KeyRound,
  ChevronDown,
  Zap,
  Download,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineToolbarProps {
  snapEnabled: boolean;
  onToggleSnap: () => void;
  onZoomToFit: () => void;
  onAddTrack: (type: string) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onBatchGenerate?: () => void;
  onExport?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Track type definitions                                             */
/* ------------------------------------------------------------------ */

interface TrackOption {
  label: string;
  type: string;
  icon: React.ElementType;
}

const TRACK_OPTIONS: TrackOption[] = [
  { label: 'Audio Track', type: 'audio', icon: Music },
  { label: 'Effects Track', type: 'effects', icon: Sparkles },
  { label: 'Camera Move', type: 'camera', icon: Video },
  { label: 'Keyframe Layer', type: 'keyframe', icon: KeyRound },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TimelineToolbar({
  snapEnabled,
  onToggleSnap,
  onZoomToFit,
  onAddTrack,
  zoom,
  onZoomChange,
  onBatchGenerate,
  onExport,
}: TimelineToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  const nudgeZoom = (delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
    onZoomChange(Math.round(next * 100) / 100);
  };

  const handleTrackSelect = (type: string) => {
    onAddTrack(type);
    setDropdownOpen(false);
  };

  return (
    <div style={styles.toolbar}>
      {/* ── Snap toggle ─────────────────────────────────── */}
      <button
        style={{
          ...styles.iconBtn,
          ...(snapEnabled ? styles.iconBtnActive : {}),
        }}
        onClick={onToggleSnap}
        title={snapEnabled ? 'Snap: On' : 'Snap: Off'}
      >
        <Magnet size={14} />
        <span style={styles.btnLabel}>
          {snapEnabled ? 'Snap: On' : 'Snap: Off'}
        </span>
      </button>

      {/* ── Zoom to fit ─────────────────────────────────── */}
      <button style={styles.iconBtn} onClick={onZoomToFit} title="Zoom to Fit">
        <Maximize2 size={14} />
      </button>

      {/* ── Zoom controls ───────────────────────────────── */}
      <div style={styles.zoomGroup}>
        <button
          style={styles.zoomBtn}
          onClick={() => nudgeZoom(-ZOOM_STEP)}
          title="Zoom Out"
          disabled={zoom <= ZOOM_MIN}
        >
          <ZoomOut size={14} />
        </button>

        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={ZOOM_STEP}
          value={zoom}
          onChange={handleZoomSlider}
          style={styles.slider}
          title={`Zoom: ${Math.round(zoom * 100)}%`}
        />

        <button
          style={styles.zoomBtn}
          onClick={() => nudgeZoom(ZOOM_STEP)}
          title="Zoom In"
          disabled={zoom >= ZOOM_MAX}
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* ── Spacer ──────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Batch Generate ──────────────────────────────── */}
      {onBatchGenerate && (
        <button
          style={styles.actionBtn}
          onClick={onBatchGenerate}
          title="Batch Generate"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Zap size={14} />
          <span>Batch</span>
        </button>
      )}

      {/* ── Export ───────────────────────────────────────── */}
      {onExport && (
        <button
          style={styles.actionBtn}
          onClick={onExport}
          title="Export"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      )}

      {/* ── Add Track dropdown ──────────────────────────── */}
      <div ref={dropdownRef} style={styles.dropdownWrapper}>
        <button
          style={styles.addTrackBtn}
          onClick={() => setDropdownOpen((o) => !o)}
        >
          <Plus size={14} />
          <span>Add Track</span>
          <ChevronDown size={12} />
        </button>

        {dropdownOpen && (
          <div style={styles.dropdown}>
            {TRACK_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  style={styles.dropdownItem}
                  onClick={() => handleTrackSelect(opt.type)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles (CSS-variable-aware)                                 */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    padding: '0 12px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-default)',
    boxSizing: 'border-box',
    flexShrink: 0,
  },

  /* ── Icon button (generic) ──────────────────────── */
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 120ms ease',
  },

  iconBtnActive: {
    color: 'var(--brand, var(--brand-purple, #a855f7))',
    background: 'var(--brand-dim, color-mix(in srgb, var(--brand-purple, #a855f7) 10%, transparent))',
    borderColor: 'color-mix(in srgb, var(--brand, var(--brand-purple, #a855f7)) 25%, transparent)',
  },

  btnLabel: {
    userSelect: 'none',
  },

  /* ── Zoom group ─────────────────────────────────── */
  zoomGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },

  zoomBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    padding: 0,
    fontSize: 11,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },

  slider: {
    width: 80,
    height: 4,
    accentColor: 'var(--brand-purple, #a855f7)',
    cursor: 'pointer',
  },

  /* ── Action button (Batch, Export) ───────────────── */
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
    padding: '0 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 120ms ease',
  },

  /* ── Add Track button + dropdown ────────────────── */
  dropdownWrapper: {
    position: 'relative',
  },

  addTrackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 26,
    padding: '0 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  dropdown: {
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: 4,
    minWidth: 170,
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
    padding: '4px 0',
    zIndex: 1000,
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    fontSize: 11,
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
