'use client';

import React, { useState } from 'react';
import { GitBranch, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import DependencyGraph, {
  MOCK_TASKS,
  CRITICAL_PATH,
} from '@/components/calendar/DependencyGraph';

const PROJECTS = ['Project Aurora', 'Project Nova', 'Short Film: Echoes'];

export default function DependenciesPage() {
  const [project, setProject] = useState(PROJECTS[0]);

  const criticalTasks = MOCK_TASKS.filter((t) => CRITICAL_PATH.has(t.id));
  const blockedTasks = MOCK_TASKS.filter((t) => t.status === 'blocked');
  const totalCriticalDays = criticalTasks.reduce(
    (s, t) => s + t.durationDays,
    0
  );

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
          <GitBranch size={24} color="var(--accent, #a855f7)" />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            Task Dependencies
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
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Project:</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            aria-label="Project filter"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text, #f1f5f9)',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PROJECTS.map((p) => (
              <option key={p} value={p} style={{ background: '#17172b' }}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </header>

      {/* Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 280px',
          gap: 20,
        }}
      >
        <DependencyGraph />

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Critical path */}
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
              <Zap size={16} color="#ef4444" />
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--text, #f1f5f9)',
                }}
              >
                Critical Path
              </h2>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted, #94a3b8)',
                marginBottom: 10,
              }}
            >
              {criticalTasks.length} tasks · {totalCriticalDays} days total
            </div>
            <ol
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {criticalTasks.map((t, i) => (
                <li
                  key={t.id}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    background: 'var(--surface-elevated, #17172b)',
                    borderLeft: '3px solid #ef4444',
                    borderRadius: 4,
                    color: 'var(--text, #f1f5f9)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {i + 1}. {t.name}
                  </span>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    {t.durationDays}d
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Blocked tasks */}
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
                Blocked Tasks
              </h2>
            </div>
            {blockedTasks.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted, #94a3b8)',
                  margin: 0,
                }}
              >
                No blocked tasks.
              </p>
            ) : (
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
                {blockedTasks.map((t) => (
                  <li
                    key={t.id}
                    style={{
                      fontSize: 12,
                      padding: 10,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 6,
                      color: 'var(--text, #f1f5f9)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted, #94a3b8)',
                        marginTop: 4,
                      }}
                    >
                      Owner: {t.owner} · Due {t.dueDate}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
