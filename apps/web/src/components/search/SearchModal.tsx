'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Film,
  User,
  Package,
  FolderOpen,
  Clock,
  ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

interface SearchResult {
  id: string;
  type: 'shot' | 'character' | 'asset' | 'project';
  name: string;
  metadata: string;
  thumbnail?: string;
  updatedAt: string;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: 's1', type: 'shot', name: 'Hero entrance — wide angle', metadata: 'Scene 3 · 24 frames', updatedAt: '2026-04-09T08:30:00Z' },
  { id: 's2', type: 'shot', name: 'Sunset fly-over establishing', metadata: 'Scene 1 · 48 frames', updatedAt: '2026-04-08T14:00:00Z' },
  { id: 's3', type: 'shot', name: 'Close-up reaction shot', metadata: 'Scene 5 · 12 frames', updatedAt: '2026-04-07T10:20:00Z' },
  { id: 'c1', type: 'character', name: 'Luna — protagonist', metadata: 'Anime style · 12 variants', updatedAt: '2026-04-09T06:00:00Z' },
  { id: 'c2', type: 'character', name: 'Rex — antagonist', metadata: '3D Render · 8 variants', updatedAt: '2026-04-06T18:00:00Z' },
  { id: 'a1', type: 'asset', name: 'Enchanted Forest BG', metadata: 'Background · 4096x2160', updatedAt: '2026-04-08T09:00:00Z' },
  { id: 'a2', type: 'asset', name: 'Magic particle FX', metadata: 'VFX · Loopable', updatedAt: '2026-04-05T12:00:00Z' },
  { id: 'a3', type: 'asset', name: 'Spaceship interior', metadata: 'Background · 3840x2160', updatedAt: '2026-04-04T15:30:00Z' },
  { id: 'p1', type: 'project', name: 'Midnight Fable', metadata: '24 shots · In progress', updatedAt: '2026-04-09T09:00:00Z' },
  { id: 'p2', type: 'project', name: 'Product Launch Ad', metadata: '8 shots · Draft', updatedAt: '2026-04-07T16:00:00Z' },
];

const TYPE_META: Record<SearchResult['type'], { label: string; icon: typeof Film }> = {
  shot: { label: 'Shots', icon: Film },
  character: { label: 'Characters', icon: User },
  asset: { label: 'Assets', icon: Package },
  project: { label: 'Projects', icon: FolderOpen },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Autofocus input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Filtered results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return MOCK_RESULTS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.metadata.toLowerCase().includes(q),
    );
  }, [debouncedQuery]);

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  // Flat list for keyboard nav
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const type of ['shot', 'character', 'asset', 'project'] as const) {
      if (grouped[type]) flat.push(...grouped[type]);
    }
    return flat;
  }, [grouped]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        const item = flatResults[selectedIndex];
        window.location.href = `/${item.type}s/${item.id}`;
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatResults, selectedIndex, onClose],
  );

  if (!open) return null;

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 120,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 600,
              maxHeight: '60vh',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            }}
          >
            {/* Search input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 18px',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <Search size={18} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search shots, characters, assets, projects..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 18,
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                ESC
              </div>
            </div>

            {/* Results */}
            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {debouncedQuery.trim() && results.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                    No results for "{debouncedQuery}"
                  </p>
                </div>
              ) : (
                (['shot', 'character', 'asset', 'project'] as const).map((type) => {
                  if (!grouped[type]) return null;
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;
                  return (
                    <div key={type} style={{ marginBottom: 4 }}>
                      <div
                        style={{
                          padding: '6px 18px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {meta.label}
                      </div>
                      {grouped[type].map((r) => {
                        const thisIdx = flatIdx++;
                        const isSelected = thisIdx === selectedIndex;
                        return (
                          <div
                            key={r.id}
                            onClick={() => { window.location.href = `/${r.type}s/${r.id}`; }}
                            onMouseEnter={() => setSelectedIndex(thisIdx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 18px',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--bg-hover)' : 'transparent',
                              transition: 'background 100ms',
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-overlay)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={14} color="var(--text-secondary)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.metadata}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                              <Clock size={10} />
                              {timeAgo(r.updatedAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {results.length > 0 && (
                <a
                  href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 0',
                    fontSize: 12,
                    color: 'var(--text-brand)',
                    textDecoration: 'none',
                    borderTop: '0.5px solid var(--border)',
                    marginTop: 4,
                  }}
                >
                  View all results <ArrowRight size={12} />
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
