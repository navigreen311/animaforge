'use client';

import { useCallback, useRef, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import type { ProjectFolder } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FolderSelectorProps {
  folders: ProjectFolder[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FolderSelector({ folders, selectedId, onChange }: FolderSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- Handlers ---- */

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewName('');
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewName('');
  }, []);

  const handleConfirmCreate = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) {
      handleCancelCreate();
      return;
    }
    // TODO: Wire to actual folder creation API / store
    // For now we just close the input
    setIsCreating(false);
    setNewName('');
  }, [newName, handleCancelCreate]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmCreate();
      } else if (e.key === 'Escape') {
        handleCancelCreate();
      }
    },
    [handleConfirmCreate, handleCancelCreate],
  );

  /* ---- Render ---- */

  const isAllActive = selectedId === null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 2,
      }}
    >
      {/* ---- "All" chip ---- */}
      <Chip
        active={isAllActive}
        onClick={() => onChange(null)}
      >
        All
      </Chip>

      {/* ---- Folder chips ---- */}
      {folders.map((folder) => {
        const active = selectedId === folder.id;
        return (
          <Chip
            key={folder.id}
            active={active}
            onClick={() => onChange(folder.id)}
          >
            {/* Color dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: folder.color,
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span>{folder.name}</span>
            <span
              style={{
                fontSize: 9,
                color: active ? 'var(--text-brand)' : 'var(--text-tertiary)',
                lineHeight: 1,
              }}
            >
              {folder.projectCount}
            </span>
          </Chip>
        );
      })}

      {/* ---- Inline create input ---- */}
      {isCreating && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--brand-border)',
            borderRadius: 'var(--radius-pill)',
            padding: '3px 8px',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Folder name"
            style={{
              width: 100,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 11,
              lineHeight: 1.4,
              padding: 0,
            }}
          />
          <button
            type="button"
            aria-label="Confirm new folder"
            onClick={handleConfirmCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--brand)',
              cursor: 'pointer',
            }}
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            aria-label="Cancel new folder"
            onClick={handleCancelCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ---- "+" add folder button ---- */}
      {!isCreating && (
        <button
          type="button"
          aria-label="Create new folder"
          onClick={handleStartCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'transparent',
            border: '0.5px solid var(--border)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-brand)';
            e.currentTarget.style.color = 'var(--brand)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chip                                                               */
/* ------------------------------------------------------------------ */

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        background: active ? 'var(--bg-active)' : 'transparent',
        border: active
          ? '0.5px solid var(--border-brand)'
          : '0.5px solid var(--border)',
        color: active ? 'var(--text-brand)' : 'var(--text-tertiary)',
        borderRadius: 'var(--radius-pill)',
        padding: '4px 12px',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: 1.4,
        transition: 'border-color 150ms, color 150ms',
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
      {children}
    </button>
  );
}
