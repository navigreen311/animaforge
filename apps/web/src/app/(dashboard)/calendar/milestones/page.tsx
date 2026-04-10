'use client';

import React, { useState } from 'react';
import {
  Flag,
  ChevronDown,
  AlertTriangle,
  CheckSquare,
  History,
} from 'lucide-react';
import MilestoneBurndown from '@/components/calendar/MilestoneBurndown';

const MILESTONES = [
  'M1: Pre-Production Complete',
  'M2: Animatic Lock',
  'M3: Animation Complete',
  'M4: Final Delivery',
];

interface MilestoneHistoryRow {
  id: string;
  name: string;
  plannedDate: string;
  actualDate: string;
  status: 'done' | 'late' | 'on_track';
  delta: string;
}

const HISTORY: MilestoneHistoryRow[] = [
  { id: 'h1', name: 'Script Lock', plannedDate: '2026-03-12', actualDate: '2026-03-13', status: 'done', delta: '+1d' },
  { id: 'h2', name: 'Storyboard Complete', plannedDate: '2026-03-20', actualDate: '2026-03-19', status: 'done', delta: '-1d' },
  { id: 'h3', name: 'Asset Kick-off', plannedDate: '2026-03-25', actualDate: '2026-03-28', status: 'late', delta: '+3d' },
  { id: 'h4', name: 'Animatic Draft', plannedDate: '2026-04-02', actualDate: '2026-04-03', status: 'done', delta: '+1d' },
];

const BLOCKERS = [
  { id: 'b1', text: 'VO contracts with principal cast pending legal review', severity: 'high' },
  { id: 'b2', text: 'Render farm capacity reduced 20% this week', severity: 'medium' },
];

const ACTION_ITEMS = [
  { id: 'a1', text: 'Escalate VO contracts to production legal', owner: 'Alice', done: false },
  { id: 'a2', text: 'Confirm render farm backup provider', owner: 'Ops', done: false },
  { id: 'a3', text: 'Daily standup moved to 9:30am', owner: 'All', done: true },
];

function statusColor(s: MilestoneHistoryRow['status']): string {
  switch (s) {
    case 'done': return '#22c55e';
    case 'late': return '#ef4444';
    case 'on_track': return '#eab308';
  }
}

export default function MilestonesPage() {
  const [milestone, setMilestone] = useState(MILESTONES[1]);

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
            {MILESTONES.map((m) => (
              <option key={m} value={m} style={{ background: '#17172b' }}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </header>

      {/* Burndown */}
      <MilestoneBurndown />

      {/* Below: history, blockers, actions */}
      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        {/* Milestone history table */}
        <section
          style={{
            background: 'var(--surface, #0f0f14)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <History size={16} color="var(--accent, #a855f7)" />
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              Milestone History
            </h2>
          </div>
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
                  letterSpacing: 0.5,
                }}
              >
                <th style={{ padding: '6px 8px' }}>Milestone</th>
                <th style={{ padding: '6px 8px' }}>Planned</th>
                <th style={{ padding: '6px 8px' }}>Actual</th>
                <th style={{ padding: '6px 8px' }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h) => (
                <tr
                  key={h.id}
                  style={{
                    borderTop: '1px solid var(--border, #26263a)',
                  }}
                >
                  <td style={{ padding: '8px' }}>{h.name}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted, #94a3b8)' }}>
                    {h.plannedDate}
                  </td>
                  <td style={{ padding: '8px' }}>{h.actualDate}</td>
                  <td
                    style={{
                      padding: '8px',
                      color: statusColor(h.status),
                      fontWeight: 600,
                    }}
                  >
                    {h.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Blockers */}
        <section
          style={{
            background: 'var(--surface, #0f0f14)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={16} color="#ef4444" />
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              Blockers
            </h2>
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {BLOCKERS.map((b) => (
              <li
                key={b.id}
                style={{
                  padding: 10,
                  background:
                    b.severity === 'high'
                      ? 'rgba(239,68,68,0.08)'
                      : 'rgba(234,179,8,0.08)',
                  border: `1px solid ${
                    b.severity === 'high'
                      ? 'rgba(239,68,68,0.3)'
                      : 'rgba(234,179,8,0.3)'
                  }`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--text, #f1f5f9)',
                  lineHeight: 1.5,
                }}
              >
                {b.text}
              </li>
            ))}
          </ul>
        </section>

        {/* Action items */}
        <section
          style={{
            background: 'var(--surface, #0f0f14)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <CheckSquare size={16} color="#22c55e" />
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              Action Items
            </h2>
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {ACTION_ITEMS.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: 10,
                  background: 'var(--surface-elevated, #17172b)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--text, #f1f5f9)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  textDecoration: a.done ? 'line-through' : 'none',
                  opacity: a.done ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked={a.done}
                  aria-label={a.text}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <div>{a.text}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted, #94a3b8)',
                      marginTop: 2,
                    }}
                  >
                    Owner: {a.owner}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
