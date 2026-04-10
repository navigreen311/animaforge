'use client';

import React, { useState } from 'react';
import { Users, ChevronLeft, ChevronRight, Sparkles, UserPlus } from 'lucide-react';
import TeamAssignmentPanel from '@/components/calendar/TeamAssignmentPanel';

const WEEKS = [
  'Apr 6 – Apr 12',
  'Apr 13 – Apr 19',
  'Apr 20 – Apr 26',
  'Apr 27 – May 3',
];

interface Freelancer {
  id: string;
  name: string;
  skill: string;
  rate: string;
  availability: string;
}

const FREELANCERS: Freelancer[] = [
  { id: 'f1', name: 'Mia Rodriguez', skill: 'Senior Animator', rate: '$85/h', availability: 'Immediate' },
  { id: 'f2', name: 'Noah Becker', skill: 'Layout Artist', rate: '$65/h', availability: 'Next week' },
  { id: 'f3', name: 'Priya Desai', skill: 'Sound Designer', rate: '$75/h', availability: 'Immediate' },
];

const SUGGESTIONS = [
  {
    id: 's1',
    title: 'Offload review tasks',
    detail: 'Move 8h of director review to Frank Wu (33% load).',
    impact: 'High',
  },
  {
    id: 's2',
    title: 'Parallelize storyboard revisions',
    detail: 'Assign Ben Ortiz B-camera panels to external freelancer.',
    impact: 'Medium',
  },
  {
    id: 's3',
    title: 'Delay non-critical Asset Design tasks',
    detail: 'Push environment polish to next sprint to protect Dan Park.',
    impact: 'Medium',
  },
];

export default function TeamPage() {
  const [weekIdx, setWeekIdx] = useState(0);

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
          <Users size={24} color="var(--accent, #a855f7)" />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            Team Capacity
          </h1>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: 4,
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
            disabled={weekIdx === 0}
            aria-label="Previous week"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text, #f1f5f9)',
              cursor: weekIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: weekIdx === 0 ? 0.4 : 1,
              padding: 6,
              display: 'flex',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text, #f1f5f9)',
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {WEEKS[weekIdx]}
          </span>
          <button
            type="button"
            onClick={() => setWeekIdx((i) => Math.min(WEEKS.length - 1, i + 1))}
            disabled={weekIdx === WEEKS.length - 1}
            aria-label="Next week"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text, #f1f5f9)',
              cursor:
                weekIdx === WEEKS.length - 1 ? 'not-allowed' : 'pointer',
              opacity: weekIdx === WEEKS.length - 1 ? 0.4 : 1,
              padding: 6,
              display: 'flex',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 320px',
          gap: 20,
        }}
      >
        <TeamAssignmentPanel />

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Rebalancing */}
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
              <Sparkles size={16} color="#a855f7" />
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--text, #f1f5f9)',
                }}
              >
                Rebalancing Suggestions
              </h2>
            </div>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {SUGGESTIONS.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: 12,
                    background: 'var(--surface-elevated, #17172b)',
                    borderRadius: 8,
                    border: '1px solid var(--border, #26263a)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text, #f1f5f9)',
                      }}
                    >
                      {s.title}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background:
                          s.impact === 'High'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(234,179,8,0.15)',
                        color: s.impact === 'High' ? '#ef4444' : '#eab308',
                        fontWeight: 600,
                      }}
                    >
                      {s.impact}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted, #94a3b8)',
                      lineHeight: 1.5,
                    }}
                  >
                    {s.detail}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Freelancers */}
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
              <UserPlus size={16} color="#22c55e" />
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--text, #f1f5f9)',
                }}
              >
                Available Freelancers
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
              {FREELANCERS.map((f) => (
                <li
                  key={f.id}
                  style={{
                    padding: 10,
                    background: 'var(--surface-elevated, #17172b)',
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text, #f1f5f9)',
                    }}
                  >
                    {f.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted, #94a3b8)',
                      marginTop: 2,
                    }}
                  >
                    {f.skill} · {f.rate}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#22c55e',
                      marginTop: 4,
                    }}
                  >
                    {f.availability}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
