'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import type { ProjectStatus, SortOption, ViewMode } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_PILLS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Generating', value: 'generating' },
  { label: 'In Review', value: 'review' },
  { label: 'Draft', value: 'draft' },
  { label: 'Complete', value: 'complete' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Name', value: 'name' },
  { label: 'Progress', value: 'progress' },
  { label: 'Shots', value: 'shots' },
];

const SORT_LABEL_MAP: Record<SortOption, string> = {
  recent: 'Recent',
  name: 'Name',
  progress: 'Progress',
  shots: 'Shots',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectFilterBar() {
  const statusFilter = useUIStore((s) => s.statusFilter);
  const setStatusFilter = useUIStore((s) => s.setStatusFilter);
  const sortOption = useUIStore((s) => s.sortOption);
  const setSortOption = useUIStore((s) => s.setSortOption);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  /* Close sort dropdown on outside click */
  useEffect(() => {
    if (!sortOpen) return;
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortOpen]);

  /* ---- Render ---- */

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 0,
        gap: 12,
      }}
    >
      {/* ---- Left: Status filter pills ---- */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
        {STATUS_PILLS.map((pill) => {
          const active = statusFilter === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              style={{
                background: active ? 'var(--brand-dim)' : 'transparent',
                border: active
                  ? '0.5px solid var(--brand-border)'
                  : '0.5px solid var(--border)',
                color: active ? 'var(--text-brand)' : 'var(--text-tertiary)',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 12px',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'border-color 150ms, color 150ms',
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ---- Right: Sort + View toggle ---- */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1.4,
            }}
          >
            Sort: {SORT_LABEL_MAP[sortOption]} ▾
          </button>

          {sortOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 4,
                zIndex: 40,
                minWidth: 120,
              }}
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sortOption === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortOption(opt.value);
                      setSortOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
                      fontSize: 10,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View toggle */}
        {(['grid', 'list'] as ViewMode[]).map((mode) => {
          const active = viewMode === mode;
          const Icon = mode === 'grid' ? LayoutGrid : List;
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                background: active ? 'var(--bg-active)' : 'transparent',
                color: active ? 'var(--text-brand)' : 'var(--text-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                padding: 0,
                transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
