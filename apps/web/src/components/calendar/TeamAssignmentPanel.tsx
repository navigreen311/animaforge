'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Lightbulb,
  Clock,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface AssignedTask {
  id: string;
  name: string;
  hoursThisWeek: number;
  dueDate: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  workloadPct: number;
  hoursThisWeek: number;
  capacityHours: number;
  tasks: AssignedTask[];
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════

const MOCK_TEAM: TeamMember[] = [
  {
    id: 'm1',
    name: 'Alice Chen',
    role: 'Director',
    initials: 'AC',
    workloadPct: 92,
    hoursThisWeek: 37,
    capacityHours: 40,
    tasks: [
      { id: 'a1', name: 'Script Lock', hoursThisWeek: 12, dueDate: '2026-04-12' },
      { id: 'a2', name: 'Final Cut Review', hoursThisWeek: 15, dueDate: '2026-04-14' },
      { id: 'a3', name: 'Dailies', hoursThisWeek: 10, dueDate: '2026-04-11' },
    ],
  },
  {
    id: 'm2',
    name: 'Ben Ortiz',
    role: 'Storyboard Artist',
    initials: 'BO',
    workloadPct: 68,
    hoursThisWeek: 27,
    capacityHours: 40,
    tasks: [
      { id: 'b1', name: 'Storyboard Panels', hoursThisWeek: 20, dueDate: '2026-04-13' },
      { id: 'b2', name: 'Revisions', hoursThisWeek: 7, dueDate: '2026-04-15' },
    ],
  },
  {
    id: 'm3',
    name: 'Carla Singh',
    role: 'Asset Designer',
    initials: 'CS',
    workloadPct: 45,
    hoursThisWeek: 18,
    capacityHours: 40,
    tasks: [
      { id: 'c1', name: 'Character Sheets', hoursThisWeek: 12, dueDate: '2026-04-16' },
      { id: 'c2', name: 'Environment Pass', hoursThisWeek: 6, dueDate: '2026-04-18' },
    ],
  },
  {
    id: 'm4',
    name: 'Dan Park',
    role: 'Animator',
    initials: 'DP',
    workloadPct: 88,
    hoursThisWeek: 35,
    capacityHours: 40,
    tasks: [
      { id: 'd1', name: 'Animatic', hoursThisWeek: 18, dueDate: '2026-04-12' },
      { id: 'd2', name: 'Rough Animation', hoursThisWeek: 17, dueDate: '2026-04-17' },
    ],
  },
  {
    id: 'm5',
    name: 'Eva Lin',
    role: 'Sound Designer',
    initials: 'EL',
    workloadPct: 52,
    hoursThisWeek: 21,
    capacityHours: 40,
    tasks: [
      { id: 'e1', name: 'VO Sessions', hoursThisWeek: 10, dueDate: '2026-04-14' },
      { id: 'e2', name: 'Foley', hoursThisWeek: 11, dueDate: '2026-04-19' },
    ],
  },
  {
    id: 'm6',
    name: 'Frank Wu',
    role: 'Layout Artist',
    initials: 'FW',
    workloadPct: 33,
    hoursThisWeek: 13,
    capacityHours: 40,
    tasks: [
      { id: 'f1', name: 'Scene Blocking', hoursThisWeek: 13, dueDate: '2026-04-20' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function workloadColor(pct: number): string {
  if (pct < 60) return '#22c55e';
  if (pct <= 85) return '#eab308';
  return '#ef4444';
}

function workloadLabel(pct: number): string {
  if (pct < 60) return 'Healthy';
  if (pct <= 85) return 'Moderate';
  return 'Overloaded';
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function TeamAssignmentPanel() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    const totalHours = MOCK_TEAM.reduce((s, m) => s + m.hoursThisWeek, 0);
    const totalCapacity = MOCK_TEAM.reduce((s, m) => s + m.capacityHours, 0);
    const available = totalCapacity - totalHours;
    return { totalHours, totalCapacity, available };
  }, []);

  return (
    <div
      style={{
        background: 'var(--surface, #0f0f14)',
        border: '1px solid var(--border, #26263a)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, #26263a)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Users size={18} color="var(--accent, #a855f7)" />
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            color: 'var(--text, #f1f5f9)',
          }}
        >
          Team Workload
        </h2>
      </header>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {MOCK_TEAM.map((m) => {
          const isOpen = expanded.has(m.id);
          const color = workloadColor(m.workloadPct);
          return (
            <li
              key={m.id}
              style={{
                borderBottom: '1px solid var(--border, #26263a)',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(m.id)}
                aria-expanded={isOpen}
                aria-label={`${m.name} workload details`}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--accent, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text, #f1f5f9)',
                        }}
                      >
                        {m.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted, #94a3b8)',
                        }}
                      >
                        {m.role}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color,
                        fontWeight: 600,
                      }}
                    >
                      {m.workloadPct}%
                    </div>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--surface-elevated, #17172b)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      role="progressbar"
                      aria-valuenow={m.workloadPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${m.name} workload ${workloadLabel(m.workloadPct)}`}
                      style={{
                        width: `${m.workloadPct}%`,
                        height: '100%',
                        background: color,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: 'var(--text-muted, #94a3b8)',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <span>{m.tasks.length} tasks</span>
                    <span>{m.hoursThisWeek}h this week</span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown size={16} color="var(--text-muted, #94a3b8)" />
                ) : (
                  <ChevronRight size={16} color="var(--text-muted, #94a3b8)" />
                )}
              </button>
              {isOpen && (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: '0 20px 14px 74px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {m.tasks.map((t) => (
                    <li
                      key={t.id}
                      style={{
                        fontSize: 12,
                        color: 'var(--text, #f1f5f9)',
                        padding: '8px 12px',
                        background: 'var(--surface-elevated, #17172b)',
                        borderRadius: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{t.name}</span>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
                        {t.hoursThisWeek}h · {t.dueDate}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <footer
        style={{
          padding: '16px 20px',
          background: 'var(--surface-elevated, #17172b)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Total Hours / Week
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              <Clock
                size={14}
                style={{ marginRight: 6, verticalAlign: 'middle' }}
              />
              {stats.totalHours}h
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Available Capacity
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: stats.available > 0 ? '#22c55e' : '#ef4444',
              }}
            >
              {stats.available}h
            </div>
          </div>
        </div>
        <div
          style={{
            padding: 12,
            background: 'var(--surface, #0f0f14)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 8,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Lightbulb size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
          <div
            style={{
              fontSize: 12,
              color: 'var(--text, #f1f5f9)',
              lineHeight: 1.5,
            }}
          >
            <strong>Suggested rebalancing:</strong> Move 8h of Alice&apos;s
            review work to Frank Wu (33% capacity) to reduce director overload
            and unblock layout finalization.
          </div>
        </div>
      </footer>
    </div>
  );
}

export { MOCK_TEAM };
