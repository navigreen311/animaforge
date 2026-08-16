'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Film,
  User,
  Package,
  FolderOpen,
  Clock,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Mock Data                                                  */
/* ------------------------------------------------------------------ */

type ResultType = 'shot' | 'character' | 'asset' | 'project';

interface SearchResult {
  id: string;
  type: ResultType;
  name: string;
  metadata: string;
  updatedAt: string;
}

/** The shape GET /api/search returns: one array per entity type. */
interface SearchResponse {
  query: string;
  projects: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  characters: Array<{ id: string; name: string; createdAt: string }>;
  scripts: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  assets: Array<{ id: string; name: string; type: string; projectId: string; createdAt: string }>;
  total: number;
}

/**
 * Flatten the per-type arrays into the flat list this screen renders.
 *
 * The screen has a `shot` facet, but the API does not search shots: a shot has
 * no title or name to match on, only a scene graph. The facet is left in place
 * and simply returns nothing rather than being silently populated from
 * something else.
 */
function toResults(data: SearchResponse): SearchResult[] {
  return [
    ...data.projects.map((r) => ({
      id: r.id,
      type: 'project' as ResultType,
      name: r.title,
      metadata: r.status,
      updatedAt: r.updatedAt,
    })),
    ...data.characters.map((r) => ({
      id: r.id,
      type: 'character' as ResultType,
      name: r.name,
      metadata: 'Character',
      updatedAt: r.createdAt,
    })),
    ...data.scripts.map((r) => ({
      id: r.id,
      type: 'project' as ResultType,
      name: r.title,
      metadata: `Script · ${r.status}`,
      updatedAt: r.updatedAt,
    })),
    ...data.assets.map((r) => ({
      id: r.id,
      type: 'asset' as ResultType,
      name: r.name,
      metadata: r.type,
      updatedAt: r.createdAt,
    })),
  ];
}

const TYPE_META: Record<ResultType, { label: string; icon: typeof Film }> = {
  shot: { label: 'Shots', icon: Film },
  character: { label: 'Characters', icon: User },
  asset: { label: 'Assets', icon: Package },
  project: { label: 'Projects', icon: FolderOpen },
};

type SortOption = 'relevance' | 'recent' | 'name';

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

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const initialType = searchParams.get('type') as ResultType | null;

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<ResultType | null>(initialType);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [sortOpen, setSortOpen] = useState(false);

  // The server does the matching; the client only filters by facet and sorts.
  const state = useResource<SearchResponse>(
    query.trim() ? `/api/search?q=${encodeURIComponent(query.trim())}` : null,
    [query],
  );

  const results = useMemo(() => (state.data ? toResults(state.data) : []), [state.data]);

  // Filter
  const filtered = useMemo(() => {
    let items = [...results];

    if (selectedType) {
      items = items.filter((r) => r.type === selectedType);
    }

    // Sort
    if (sort === 'recent') {
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [results, selectedType, sort]);

  // Facet counts
  const facetCounts = useMemo(() => {
    const counts: Record<string, number> = { all: results.length };
    for (const r of results) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }, [results]);

  // Group results
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of filtered) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [filtered]);

  const sortLabels: Record<SortOption, string> = {
    relevance: 'Relevance',
    recent: 'Most recent',
    name: 'Name',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top search bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Search size={18} color="var(--text-tertiary)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything..."
          autoFocus
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 16,
            fontFamily: 'var(--font-sans)',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar — facets */}
        <div
          style={{
            width: 200,
            borderRight: '0.5px solid var(--border)',
            padding: '16px 0',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '0 16px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            <SlidersHorizontal size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            Filter by type
          </div>

          {/* All */}
          <div
            onClick={() => setSelectedType(null)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: selectedType === null ? 'var(--bg-active)' : 'transparent',
              borderLeft:
                selectedType === null ? '2px solid var(--brand)' : '2px solid transparent',
              transition: 'all 120ms',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: selectedType === null ? 'var(--text-brand)' : 'var(--text-primary)',
              }}
            >
              All
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {facetCounts.all || 0}
            </span>
          </div>

          {(['shot', 'character', 'asset', 'project'] as const).map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const isActive = selectedType === type;
            return (
              <div
                key={type}
                onClick={() => setSelectedType(isActive ? null : type)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                  transition: 'all 120ms',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: isActive ? 'var(--text-brand)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon size={13} />
                  {meta.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {facetCounts[type] || 0}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main results area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* Sort dropdown */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 16,
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Sort: {sortLabels[sort]}
              <ChevronDown size={12} />
            </button>
            {sortOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  zIndex: 10,
                  minWidth: 140,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                {(['relevance', 'recent', 'name'] as const).map((opt) => (
                  <div
                    key={opt}
                    onClick={() => {
                      setSort(opt);
                      setSortOpen(false);
                    }}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      color: sort === opt ? 'var(--text-brand)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      background: sort === opt ? 'var(--bg-active)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (sort !== opt) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (sort !== opt) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {sortLabels[opt]}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grouped results */}
          {state.loading ? (
            <div style={{ padding: '24px 0' }}>
              <LoadingState label="Searching…" />
            </div>
          ) : state.error ? (
            <div style={{ padding: '24px 0' }}>
              <ErrorState error={state.error} onRetry={state.reload} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Search size={32} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                {query.trim() ? `No results for "${query}"` : 'Start typing to search'}
              </p>
            </div>
          ) : (
            (['shot', 'character', 'asset', 'project'] as const).map((type) => {
              if (!grouped[type]) return null;
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              return (
                <div key={type} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon size={12} />
                    {meta.label} ({grouped[type].length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {grouped[type].map((r) => (
                      <a
                        key={r.id}
                        href={`/${r.type}s/${r.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          textDecoration: 'none',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-overlay)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={15} color="var(--text-secondary)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}
                          >
                            {r.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {r.metadata}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        >
                          <Clock size={10} />
                          {timeAgo(r.updatedAt)}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
