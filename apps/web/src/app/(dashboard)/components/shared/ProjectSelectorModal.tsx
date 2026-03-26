'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_PROJECTS } from '@/lib/mockData';

/* ── Types ───────────────────────────────────────────────── */

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}

/* ── Status badge colors ─────────────────────────────────── */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  generating: { bg: 'rgba(124,58,237,0.15)', text: '#a78bfa' },
  review: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  draft: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  completed: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
};

/* ── Component ───────────────────────────────────────────── */

export default function ProjectSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: ProjectSelectorModalProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Filter projects by search term ──────────────────── */
  const filtered = useMemo(
    () =>
      MOCK_PROJECTS.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  /* ── Autofocus & Escape key ──────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    requestAnimationFrame(() => searchRef.current?.focus());

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (projectId: string) => {
    onSelect(projectId);
    onClose();
    toast.success('Character added to project');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          width: 400,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Select Project
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--text-primary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--text-tertiary)')
            }
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Search ──────────────────────────────────────── */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 30px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              width: '100%',
              fontFamily: 'inherit',
              transition: 'border-color 150ms',
              boxSizing: 'border-box',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = 'var(--border-brand)')
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = 'var(--border)')
            }
          />
        </div>

        {/* ── Project List ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                padding: '20px 0',
                margin: 0,
              }}
            >
              No projects found
            </p>
          )}

          {filtered.map((project) => {
            const statusColor = STATUS_COLORS[project.status] ?? STATUS_COLORS.draft;

            return (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 150ms',
                  cursor: 'default',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {/* Gradient swatch */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: project.thumbnailGradient,
                    flexShrink: 0,
                    border: '0.5px solid var(--border)',
                  }}
                />

                {/* Title */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.title}
                </span>

                {/* Status badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    background: statusColor.bg,
                    color: statusColor.text,
                    textTransform: 'capitalize',
                    flexShrink: 0,
                  }}
                >
                  {project.status}
                </span>

                {/* Select button */}
                <button
                  type="button"
                  onClick={() => handleSelect(project.id)}
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'opacity 150ms',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = '0.85')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = '1')
                  }
                >
                  Select
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
