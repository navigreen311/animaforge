'use client';

import { useState } from 'react';
import { Plus, User } from 'lucide-react';

// ── Sample Data ───────────────────────────────────────────────
type CharacterStatus = 'active' | 'draft';

interface Character {
  id: string;
  name: string;
  role: string;
  style: string;
  status: CharacterStatus;
  shots: number;
  gradient: string;
}

const CHARACTERS: Character[] = [
  {
    id: 'char-1',
    name: 'Kai Tanaka',
    role: 'Cyber Samurai',
    style: 'Anime',
    status: 'active',
    shots: 12,
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    id: 'char-2',
    name: 'Luna Evergreen',
    role: 'Guardian of the Garden',
    style: 'Watercolor',
    status: 'active',
    shots: 8,
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  {
    id: 'char-3',
    name: 'Dr. Echo',
    role: 'Time Scientist',
    style: 'Realistic',
    status: 'draft',
    shots: 0,
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
  {
    id: 'char-4',
    name: 'Pixel',
    role: 'Robot Companion',
    style: 'Cartoon',
    status: 'active',
    shots: 6,
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
  },
];

type FilterTab = 'all' | 'active' | 'draft';

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
];

// ── Component ─────────────────────────────────────────────────
export default function CharactersPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const filtered =
    activeFilter === 'all'
      ? CHARACTERS
      : CHARACTERS.filter((c) => c.status === activeFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Characters
          </h1>

          <button
            type="button"
            style={{
              background: 'var(--brand)',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            <Plus size={13} />
            New Character
          </button>
        </div>

        {/* ── Filter Tabs ───────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveFilter(tab.value)}
              style={{
                background:
                  activeFilter === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color:
                  activeFilter === tab.value
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                border:
                  activeFilter === tab.value
                    ? '0.5px solid var(--border)'
                    : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeFilter === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Character Grid ────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {filtered.map((character) => (
            <div
              key={character.id}
              onMouseEnter={() => setHoveredCard(character.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: 'var(--bg-elevated)',
                border:
                  hoveredCard === character.id
                    ? '0.5px solid var(--border-brand)'
                    : '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
            >
              {/* Gradient top area */}
              <div
                style={{
                  height: 100,
                  background: character.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={32} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 14px 14px' }}>
                {/* Name + status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {character.name}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background:
                        character.status === 'active' ? '#22c55e' : '#eab308',
                      flexShrink: 0,
                    }}
                    title={character.status}
                  />
                </div>

                {/* Role subtitle */}
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    margin: '2px 0 10px',
                  }}
                >
                  {character.role}
                </p>

                {/* Style badge + shot count */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-hover)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {character.style}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {character.shots} shot{character.shots !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
