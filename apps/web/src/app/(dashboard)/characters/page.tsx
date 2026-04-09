'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Plus,
  User,
  Pencil,
  FolderOpen,
  MoreHorizontal,
  Volume2,
} from 'lucide-react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EmptyState from '@/components/ui/EmptyState';
import CharacterStatsRow from '../components/characters/CharacterStatsRow';
import CharacterFilterBar, {
  type CharacterFilters,
} from '../components/characters/CharacterFilterBar';
import NewCharacterModal from '../components/characters/NewCharacterModal';
import { MOCK_CHARACTERS, MOCK_CHARACTER_STATS } from '@/lib/mockData';
import type { Character, CharacterStats } from '@/lib/types';

// ── Status dot color map ──────────────────────────────────
const STATUS_COLORS: Record<Character['status'], string> = {
  active: '#22c55e',
  processing: '#eab308',
  draft: '#9ca3af',
  failed: '#ef4444',
};

// ── Rights badge labels ───────────────────────────────────
const RIGHTS_LABELS: Record<string, string> = {
  personal: 'Personal use',
  commercial: 'Commercial',
  expired: 'Consent expired',
};

const RIGHTS_COLORS: Record<string, { bg: string; text: string }> = {
  personal: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' },
  commercial: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
  expired: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
};

// ── Drift score color helper ──────────────────────────────
function driftColor(score: number): string {
  if (score > 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

// ── Style mode mapping for filter comparison ──────────────
const STYLE_FILTER_MAP: Record<string, string> = {
  Realistic: 'realistic',
  Anime: 'anime',
  Cartoon: 'cartoon',
  'Cel-shaded': 'cel-shaded',
  Pixel: 'pixel',
};

const PROJECT_FILTER_MAP: Record<string, string> = {
  'Cyber Samurai': 'proj_cyber_samurai',
  'The Last Garden': 'proj_last_garden',
  'Echoes of Tomorrow': 'proj_echoes',
};

// ── Component ─────────────────────────────────────────────
export default function CharactersPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [newCharModalOpen, setNewCharModalOpen] = useState(false);
  const [filters, setFilters] = useState<CharacterFilters>({
    search: '',
    style: 'All styles',
    project: 'All projects',
    digitalTwinsOnly: false,
  });

  // ── Fetch characters (falls back to mock data) ──────────
  const {
    data: characters = MOCK_CHARACTERS,
    isLoading: charsLoading,
    isError: charsError,
    refetch: refetchCharacters,
  } = useQuery<Character[]>({
    queryKey: ['characters'],
    queryFn: async () => {
      const res = await fetch('/api/characters');
      if (!res.ok) throw new Error('Failed to fetch characters');
      const data = await res.json();
      return data.characters ?? MOCK_CHARACTERS;
    },
    placeholderData: MOCK_CHARACTERS,
    refetchInterval: 30_000,
  });

  // ── Fetch stats (falls back to mock data) ───────────────
  const { data: stats = MOCK_CHARACTER_STATS, isLoading: statsLoading } =
    useQuery<CharacterStats>({
      queryKey: ['character-stats'],
      queryFn: async () => {
        const res = await fetch('/api/characters/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        return data.stats ?? MOCK_CHARACTER_STATS;
      },
      placeholderData: MOCK_CHARACTER_STATS,
    });

  // ── Client-side filtering ───────────────────────────────
  const handleFilterChange = useCallback((next: CharacterFilters) => {
    setFilters(next);
  }, []);

  const filteredCharacters = useMemo(() => {
    let result = [...characters];

    // Search
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false),
      );
    }

    // Status — not a filter bar field, but characters have statuses
    // Style filter
    if (filters.style !== 'All styles') {
      const mapped = STYLE_FILTER_MAP[filters.style];
      if (mapped) {
        result = result.filter((c) => c.styleMode === mapped);
      }
    }

    // Project filter
    if (filters.project !== 'All projects') {
      const projId = PROJECT_FILTER_MAP[filters.project];
      if (projId) {
        result = result.filter((c) => c.projectIds.includes(projId));
      }
    }

    // Digital twins only
    if (filters.digitalTwinsOnly) {
      result = result.filter((c) => c.isDigitalTwin);
    }

    // Sort by updated descending
    result.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return result;
  }, [characters, filters]);

  // ── Render ──────────────────────────────────────────────
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
          <div>
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
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0',
              }}
            >
              {characters.length} character{characters.length !== 1 ? 's' : ''} in your library
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNewCharModalOpen(true)}
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

        {/* ── Stats Row ─────────────────────────────────── */}
        <CharacterStatsRow stats={stats} loading={statsLoading} />

        {/* ── Filter Bar ────────────────────────────────── */}
        <CharacterFilterBar onChange={handleFilterChange} />

        {/* ── Error State ───────────────────────────────── */}
        {charsError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              Could not load characters
            </p>
            <button
              type="button"
              onClick={() => refetchCharacters()}
              style={{
                background: 'var(--brand)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : charsLoading && characters.length === 0 ? (
          /* ── Loading skeleton ─────────────────────────── */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="animate-pulse"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  height: 220,
                }}
              />
            ))}
          </div>
        ) : filteredCharacters.length === 0 ? (
          /* ── Empty state ──────────────────────────────── */
          <EmptyState
            icon={User}
            title="No characters yet"
            description="Create your first character to start building your cast. Characters can be reused across multiple projects."
            action={{ label: 'Create Character', onClick: () => setNewCharModalOpen(true) }}
          />
        ) : (
          /* ── Character Grid ──────────────────────────── */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {filteredCharacters.map((character) => {
              const isHovered = hoveredCard === character.id;

              return (
                <div
                  key={character.id}
                  onClick={() => router.push(`/characters/${character.id}`)}
                  onMouseEnter={() => setHoveredCard(character.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: isHovered
                      ? '0.5px solid var(--border-brand)'
                      : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    boxShadow: isHovered
                      ? '0 2px 12px rgba(0, 0, 0, 0.15)'
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* ── Thumbnail / Avatar area ──────────── */}
                  <div
                    style={{
                      height: 100,
                      background: `linear-gradient(135deg, ${character.avatarColor}88, ${character.avatarColor}44)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <User size={32} style={{ color: 'rgba(255,255,255,0.6)' }} />

                    {/* ── Quick action overlay on hover ──── */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/characters/${character.id}?edit=true`);
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '0.5px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Use in Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: open project assignment dialog
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '0.5px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <FolderOpen size={14} />
                        </button>
                        <button
                          type="button"
                          title="More options"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: open context menu
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '0.5px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Card Body ────────────────────────── */}
                  <div style={{ padding: '12px 14px 0', flex: 1 }}>
                    {/* Name row: status dot + name + badges */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {/* Status dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: STATUS_COLORS[character.status],
                          flexShrink: 0,
                        }}
                        title={character.status}
                      />

                      {/* Name */}
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {character.name}
                      </span>

                      {/* Digital Twin badge */}
                      {character.isDigitalTwin && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm, 4px)',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            flexShrink: 0,
                          }}
                        >
                          Twin
                        </span>
                      )}

                      {/* Voice icon */}
                      {character.voiceId && (
                        <Volume2
                          size={13}
                          style={{
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                          title={character.voiceName ?? 'Voice paired'}
                        />
                      )}
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        margin: '2px 0 10px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {character.description ?? character.styleMode}
                    </p>

                    {/* Style badge + shot count + rights badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Style badge */}
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
                          {character.styleMode}
                        </span>

                        {/* Rights badge for digital twins */}
                        {character.isDigitalTwin && character.rightsScope && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-md)',
                              background:
                                RIGHTS_COLORS[character.rightsScope]?.bg ??
                                'var(--bg-hover)',
                              color:
                                RIGHTS_COLORS[character.rightsScope]?.text ??
                                'var(--text-secondary)',
                            }}
                          >
                            {RIGHTS_LABELS[character.rightsScope] ?? character.rightsScope}
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        {character.shotCount} shot{character.shotCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* ── Drift Score Bar ──────────────────── */}
                  <div style={{ padding: '10px 14px 12px' }}>
                    {character.driftScore != null ? (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--text-tertiary)',
                              fontWeight: 500,
                            }}
                          >
                            Drift score
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: driftColor(character.driftScore),
                            }}
                          >
                            {character.driftScore}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: 'var(--bg-hover)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(character.driftScore, 100)}%`,
                              borderRadius: 2,
                              background: driftColor(character.driftScore),
                              transition: 'width 300ms ease',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-tertiary)',
                            fontWeight: 500,
                          }}
                        >
                          Drift score
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-tertiary)',
                            fontStyle: 'italic',
                          }}
                        >
                          &mdash; not yet scored
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── New Character Modal ──────────────────────────── */}
      <NewCharacterModal
        open={newCharModalOpen}
        onClose={() => setNewCharModalOpen(false)}
      />
    </div>
  );
}
