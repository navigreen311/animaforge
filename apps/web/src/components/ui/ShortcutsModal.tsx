'use client';

import { useEffect, useRef } from 'react';
import { SHORTCUT_GROUPS } from '@/lib/keyboard-shortcuts';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay attachment by a tick to avoid the opening click closing it
    const id = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close shortcuts modal"
          >
            &times;
          </button>
        </div>

        {/* ── Groups ─────────────────────────────────── */}
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-tertiary)',
              }}
            >
              {group.title}
            </h3>

            {group.shortcuts.map((sc) => (
              <div
                key={sc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {sc.description}
                </span>

                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {sc.keys.map((k, i) => (
                    <span key={k + i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {i > 0 && sc.chord && (
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>then</span>
                      )}
                      {i > 0 && !sc.chord && (
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+</span>
                      )}
                      <kbd
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 24,
                          height: 22,
                          padding: '0 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-overlay)',
                          border: '0.5px solid var(--border-strong)',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)',
                          lineHeight: 1,
                        }}
                      >
                        {k}
                      </kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* ── Footer hint ────────────────────────────── */}
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
          }}
        >
          Press <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>?</kbd> to toggle this
          modal
        </p>
      </div>
    </div>
  );
}
