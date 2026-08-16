'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

/**
 * Team assignment.
 *
 * What this page used to show, and why most of it is gone:
 *
 *   - A week picker over four hardcoded date ranges.
 *   - A workload board (TeamAssignmentPanel) giving every member a load
 *     percentage, hours booked this week, a capacity in hours and a list of
 *     assigned tasks with due dates.
 *   - Three "rebalancing suggestions" naming specific people and hour counts.
 *   - A freelancer marketplace with names, hourly rates and availability.
 *
 * None of that has a table. `team_members` records a user, a team and a role.
 * There is no task assignment, no hours, no capacity, no rate card and no
 * freelancer directory anywhere in the schema, so there is nothing to compute a
 * workload from and nothing to rebalance. The panels were removed rather than
 * re-pointed at data that does not exist — see docs/persistence.md.
 *
 * What remains is the real roster.
 */

interface MemberRow {
  id: string;
  role: string;
  teamName: string;
  user: { id: string; email: string; displayName: string | null } | null;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface, #0f0f14)',
  border: '1px solid var(--border, #26263a)',
  borderRadius: 12,
  padding: 16,
};

export default function CalendarTeamPage() {
  const state = useResource<{ items: MemberRow[] }>('/api/team/members');
  const members = state.data?.items ?? [];

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Users size={24} color="var(--accent, #a855f7)" />
        <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text, #f1f5f9)' }}>Team Assignment</h1>
      </header>

      {state.loading && <LoadingState label="Loading team" />}
      {!state.loading && state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {!state.loading && !state.error && (
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text, #f1f5f9)' }}>
            Roster
          </h2>

          {members.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
              No team members yet.
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
                  <th style={{ padding: '6px 8px' }}>Member</th>
                  <th style={{ padding: '6px 8px' }}>Team</th>
                  <th style={{ padding: '6px 8px' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border, #26263a)' }}>
                    <td style={{ padding: 8 }}>{m.user?.displayName ?? m.user?.email ?? m.id}</td>
                    <td style={{ padding: 8 }}>{m.teamName}</td>
                    <td style={{ padding: 8 }}>{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ margin: '14px 0 0', fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
            Per-member workload, weekly capacity, task assignment, rebalancing suggestions and the
            freelancer directory are not shown: nothing in the schema records assigned hours,
            capacity or rates.
          </p>
        </section>
      )}
    </div>
  );
}
