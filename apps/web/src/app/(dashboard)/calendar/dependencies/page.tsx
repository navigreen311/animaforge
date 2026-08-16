'use client';

import React from 'react';
import { GitBranch } from 'lucide-react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

/**
 * Task dependencies.
 *
 * The graph this page used to draw came from `MOCK_TASKS` and `CRITICAL_PATH`
 * inside DependencyGraph: ten named tasks with owners, durations, statuses and
 * a hand-written critical path, plus a three-project picker.
 *
 * `task_dependencies` is real and holds the edges — from_task_id, to_task_id,
 * type. What it does not have is nodes: there is no task table anywhere in the
 * schema, so the ids on either end of an edge resolve to nothing. Without a
 * name, a duration or a status per node there is no box to draw, no lane to put
 * it in and no critical path to compute (a critical path is the longest
 * duration-weighted chain, and there are no durations).
 *
 * So this lists the edges that exist and says what is missing, instead of
 * rendering a graph of invented tasks.
 */

interface DependencyRow {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: string;
  createdAt: string;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface, #0f0f14)',
  border: '1px solid var(--border, #26263a)',
  borderRadius: 12,
  padding: 16,
};

const monospace = 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

export default function DependenciesPage() {
  const state = useResource<{ items: DependencyRow[] }>('/api/calendar/dependencies');
  const edges = state.data?.items ?? [];

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <GitBranch size={24} color="var(--accent, #a855f7)" />
        <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text, #f1f5f9)' }}>
          Task Dependencies
        </h1>
      </header>

      {state.loading && <LoadingState label="Loading dependencies" />}
      {!state.loading && state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {!state.loading && !state.error && (
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text, #f1f5f9)' }}>
            Edges ({edges.length})
          </h2>

          {edges.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
              No dependencies recorded.
            </p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '6px 8px' }}>From</th>
                  <th style={{ padding: '6px 8px' }}>To</th>
                  <th style={{ padding: '6px 8px' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border, #26263a)' }}>
                    <td style={{ padding: 8, fontFamily: monospace }}>{e.fromTaskId}</td>
                    <td style={{ padding: 8, fontFamily: monospace }}>{e.toTaskId}</td>
                    <td style={{ padding: 8 }}>{e.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ margin: '14px 0 0', fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
            Shown as ids: dependencies point at tasks, but the schema has no task table, so there is
            no name, owner, duration or status to resolve them to — and no critical path to compute
            without durations.
          </p>
        </section>
      )}
    </div>
  );
}
