'use client';

import { useState, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';

export interface CharacterFilters {
  search: string;
  style: string;
  project: string;
  digitalTwinsOnly: boolean;
}

interface CharacterFilterBarProps {
  onChange: (filters: CharacterFilters) => void;
}

const STYLE_OPTIONS = [
  'All styles',
  'Realistic',
  'Anime',
  'Cartoon',
  'Cel-shaded',
  'Pixel',
] as const;

const PROJECT_OPTIONS = [
  'All projects',
  'Cyber Samurai',
  'The Last Garden',
  'Echoes of Tomorrow',
] as const;

const inputBaseStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  height: 32,
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
};

export default function CharacterFilterBar({ onChange }: CharacterFilterBarProps) {
  const [filters, setFilters] = useState<CharacterFilters>({
    search: '',
    style: 'All styles',
    project: 'All projects',
    digitalTwinsOnly: false,
  });

  const update = useCallback(
    (patch: Partial<CharacterFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      {/* Search input */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          flex: '1 1 200px',
          maxWidth: 280,
        }}
      >
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search characters..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          style={{
            ...inputBaseStyle,
            width: '100%',
            paddingLeft: 30,
            paddingRight: 10,
          }}
        />
      </div>

      {/* Style filter */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Filter
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <select
          value={filters.style}
          onChange={(e) => update({ style: e.target.value })}
          style={{
            ...inputBaseStyle,
            paddingLeft: 30,
            paddingRight: 10,
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            minWidth: 130,
          }}
        >
          {STYLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Project filter */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Filter
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <select
          value={filters.project}
          onChange={(e) => update({ project: e.target.value })}
          style={{
            ...inputBaseStyle,
            paddingLeft: 30,
            paddingRight: 10,
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            minWidth: 160,
          }}
        >
          {PROJECT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Digital twins toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={filters.digitalTwinsOnly}
          onChange={(e) => update({ digitalTwinsOnly: e.target.checked })}
          style={{
            width: 14,
            height: 14,
            accentColor: 'var(--accent)',
            cursor: 'pointer',
          }}
        />
        Digital twins only
      </label>
    </div>
  );
}
