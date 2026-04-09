'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CURRENT_VERSION = '1.2.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  items: { category: 'Major' | 'New' | 'Fixed' | 'Improved'; text: string }[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-04-07',
    items: [
      { category: 'Major', text: 'Avatar Studio v2 with real-time pose editing and multi-angle preview' },
      { category: 'New', text: 'Brand Kit — save and reuse color palettes, fonts, and logo watermarks across projects' },
      { category: 'New', text: 'Batch render queue: schedule up to 20 renders at once' },
      { category: 'Improved', text: 'Script AI now supports 12 additional languages for dialogue generation' },
      { category: 'Fixed', text: 'Timeline drag-and-drop no longer drops frames when moving clips across tracks' },
      { category: 'Fixed', text: 'Audio Studio waveform rendering corrected for files longer than 30 minutes' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-15',
    items: [
      { category: 'Major', text: 'Style Studio — AI-powered style transfer for consistent visual themes' },
      { category: 'New', text: 'Team collaboration: invite members, assign roles, leave comments on timeline' },
      { category: 'New', text: 'Asset Library search now supports tags and natural language queries' },
      { category: 'Improved', text: 'Generation speed improved by 40% on average for 1080p renders' },
      { category: 'Improved', text: 'Dashboard overview now shows real-time credit usage chart' },
      { category: 'Fixed', text: 'Export dialog no longer resets format selection on re-open' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-01',
    items: [
      { category: 'Major', text: 'Initial release of AnimaForge' },
      { category: 'New', text: 'Script AI: generate and refine animation scripts with AI assistance' },
      { category: 'New', text: 'Avatar Studio: create and customize character avatars' },
      { category: 'New', text: 'Audio Studio: generate voiceovers, sound effects, and background music' },
      { category: 'New', text: 'Timeline editor with multi-track support and keyframe animation' },
      { category: 'New', text: 'Asset Library with 500+ starter assets' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared rendering                                                   */
/* ------------------------------------------------------------------ */

const categoryColors: Record<string, { bg: string; text: string }> = {
  Major: { bg: 'rgba(124, 58, 237, 0.2)', text: '#c4b5fd' },
  New: { bg: 'rgba(52, 211, 153, 0.15)', text: '#6ee7b7' },
  Fixed: { bg: 'rgba(96, 165, 250, 0.15)', text: '#93c5fd' },
  Improved: { bg: 'rgba(234, 179, 8, 0.15)', text: '#fbbf24' },
};

export function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Version + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          v{entry.version}
        </span>
        {entry.version === CURRENT_VERSION && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--brand-dim)',
              color: 'var(--brand-light)',
            }}
          >
            NEW
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{entry.date}</span>
      </div>

      {/* Items grouped by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
        {entry.items.map((item, i) => {
          const cat = categoryColors[item.category] ?? categoryColors.New;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: cat.bg,
                  color: cat.text,
                  marginTop: 2,
                }}
              >
                {item.category}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal component                                                    */
/* ------------------------------------------------------------------ */

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ open, onClose }: ChangelogModalProps) {
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
    const id = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // Mark as seen
  useEffect(() => {
    if (open) {
      localStorage.setItem('af-last-seen-version', CURRENT_VERSION);
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
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
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 560,
            maxHeight: '80vh',
            overflowY: 'auto',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              What&apos;s new in AnimaForge
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
              aria-label="Close changelog modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Entries */}
          {CHANGELOG_ENTRIES.map((entry) => (
            <div
              key={entry.version}
              style={{
                paddingBottom: 20,
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <ChangelogEntryCard entry={entry} />
            </div>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-show hook                                                     */
/* ------------------------------------------------------------------ */

export function useChangelogAutoShow() {
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('af-last-seen-version');
    if (!lastSeen || lastSeen < CURRENT_VERSION) {
      setShowChangelog(true);
    }
  }, []);

  return { showChangelog, setShowChangelog };
}
