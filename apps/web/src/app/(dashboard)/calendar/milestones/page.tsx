'use client';

import React, { useMemo, useState } from 'react';
import { Flag, ChevronDown, History } from 'lucide-react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

/** A milestone is a calendar event whose type is 'milestone'. */
interface MilestoneRow {
  id: string;
  title: string;
  type: string;
  startDate: string;
  status: string;
}

// calendar_events.status is a free-form string, so anything unrecognised keeps
// the neutral colour instead of falling through to undefined.
function statusColor(s: string): string {
  switch (s) {
    case 'done':
    case 'complete':
      return '#22c55e';
    case 'late':
    case 'overdue':
      return '#ef4444';
    case 'on_track':
    case 'in_progress':
      return '#eab308';
    default:
      return 'var(--text-muted, #94a3b8)';
  }
}

export default function MilestonesPage() {
  // The events collection has no type filter (its list query takes page, limit
  // and a text search only), so the narrowing happens here rather than sending
  // a parameter the API would silently ignore and calling every meeting a
  // milestone.
  const state = useResource<{ items: MilestoneRow[] }>('/api/calendar/events?limit=200');
  const milestones = useMemo(
    () => (state.data?.items ?? []).filter((e) => e.type === 'milestone'),
    [state.data],
  );
  const [milestone, setMilestone] = useState('');

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Flag size={24} color="var(--accent, #a855f7)" />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            Milestone Burndown
          </h1>
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 8,
            color: 'var(--text, #f1f5f9)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Milestone:</span>
          <select
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            aria-label="Milestone selector"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text, #f1f5f9)',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {milestones.map((m) => (
              <option key={m.id} value={m.id} style={{ background: '#17172b' }}>
                {m.title}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </header>

      {/* What this page used to draw, and why it no longer does.

          The burndown chart generated its own curve — 25 tasks over 30 days,
          with a sine-wave "actual" line drifting around the plan. The history
          table compared planned against actual dates. Blockers and action items
          were four more literals.

          None of it has a table behind it. calendar_events records a title, a
          type, a start and end and a status; it has no task count, no per-day
          completion, no baseline to burn down against, no actual-vs-planned
          delta, no blockers and no action items. So the panels are gone rather
          than redrawn from invented numbers, and what is listed below is the
          milestones that actually exist. */}
      {state.loading && <LoadingState label="Loading milestones" />}
      {!state.loading && state.error && <ErrorState error={state.error} onRetry={state.reload} />}
      {!state.loading && !state.error && (
        <section
          style={{
            background: 'var(--surface, #0f0f14)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <History size={16} color="var(--accent, #a855f7)" />
            <h2 style={{ margin: 0, fontSize: 14, color: 'var(--text, #f1f5f9)' }}>Milestones</h2>
          </div>

          {milestones.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
              No milestone events yet. Add one from the calendar.
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
                  <th style={{ padding: '6px 8px' }}>Milestone</th>
                  <th style={{ padding: '6px 8px' }}>Date</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border, #26263a)' }}>
                    <td style={{ padding: '8px' }}>{m.title}</td>
                    <td style={{ padding: '8px' }}>{m.startDate.slice(0, 10)}</td>
                    <td style={{ padding: '8px', color: statusColor(m.status) }}>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
            Burndown, planned-vs-actual variance, blockers and action items need tables that do not
            exist yet.
          </p>
        </section>
      )}
    </div>
  );
}
