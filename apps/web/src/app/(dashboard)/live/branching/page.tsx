'use client';

import Link from 'next/link';
import { ChevronRight, GitBranch, FileText } from 'lucide-react';
import BranchingNarrativeEditor from '@/components/live/BranchingNarrativeEditor';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

/**
 * One narrative, as GET /api/live/narratives returns it.
 *
 * A narrative is not a table: it is the set of branching_scenes sharing a
 * narrative_id, grouped server-side. That is why there is an id and a scene
 * count but no name -- nothing stores one.
 */
interface NarrativeRow {
  narrativeId: string;
  sceneCount: number;
  updatedAt: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function BranchingNarrativesPage() {
  const state = useResource<{ items: NarrativeRow[] }>('/api/live/narratives');
  const narratives = state.data?.items ?? [];

  return (
    <div style={{ padding: 24, color: 'var(--fg, #e5e7eb)' }}>
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--muted, #9ca3af)',
          marginBottom: 8,
        }}
      >
        <Link href="/live" style={{ color: 'inherit', textDecoration: 'none' }}>
          Live
        </Link>
        <ChevronRight size={12} />
        <span>Branching</span>
      </nav>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <GitBranch size={22} />
        <h1 style={{ margin: 0, fontSize: 22 }}>Branching Narratives</h1>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 16,
        }}
      >
        <aside
          style={{
            background: 'var(--surface, #0b0b10)',
            border: '1px solid var(--border, #262631)',
            borderRadius: 12,
            padding: 12,
            alignSelf: 'start',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted, #9ca3af)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Saved narratives
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {state.loading && <LoadingState label="Loading narratives" />}
            {!state.loading && state.error && (
              <ErrorState error={state.error} onRetry={state.reload} />
            )}
            {!state.loading && !state.error && narratives.length === 0 && (
              <li style={{ fontSize: 12, color: 'var(--muted, #9ca3af)' }}>
                No narratives yet.
              </li>
            )}
            {narratives.map((n) => (
              <li key={n.narrativeId}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--card, #14141b)',
                    border: '1px solid var(--border, #262631)',
                    color: 'var(--fg, #e5e7eb)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FileText size={14} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{n.narrativeId}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted, #9ca3af)' }}>
                      {n.sceneCount} scenes | {relativeTime(n.updatedAt)}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <BranchingNarrativeEditor />
      </div>
    </div>
  );
}
