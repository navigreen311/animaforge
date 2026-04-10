'use client';

import React, { useState, useMemo } from 'react';
import { X, Edit3, Clock, User as UserIcon, Calendar as CalendarIcon } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type TaskStatus = 'done' | 'in_progress' | 'blocked' | 'pending';

interface Task {
  id: string;
  name: string;
  durationDays: number;
  owner: string;
  ownerInitial: string;
  status: TaskStatus;
  description: string;
  dueDate: string;
  dependsOn: string[];
}

interface PositionedTask extends Task {
  x: number;
  y: number;
  column: number;
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════

const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    name: 'Script Lock',
    durationDays: 5,
    owner: 'Alice Chen',
    ownerInitial: 'A',
    status: 'done',
    description: 'Finalize shooting script with all revisions and stakeholder approval.',
    dueDate: '2026-03-15',
    dependsOn: [],
  },
  {
    id: 't2',
    name: 'Storyboard',
    durationDays: 7,
    owner: 'Ben Ortiz',
    ownerInitial: 'B',
    status: 'done',
    description: 'Complete panel-by-panel storyboard aligned to the locked script.',
    dueDate: '2026-03-22',
    dependsOn: ['t1'],
  },
  {
    id: 't3',
    name: 'Asset Design',
    durationDays: 10,
    owner: 'Carla Singh',
    ownerInitial: 'C',
    status: 'in_progress',
    description: 'Character, prop, and environment design sheets ready for modeling.',
    dueDate: '2026-04-01',
    dependsOn: ['t2'],
  },
  {
    id: 't4',
    name: 'Animatic',
    durationDays: 6,
    owner: 'Dan Park',
    ownerInitial: 'D',
    status: 'in_progress',
    description: 'Timed animatic with scratch audio and pacing locked.',
    dueDate: '2026-04-05',
    dependsOn: ['t2'],
  },
  {
    id: 't5',
    name: 'Voice Recording',
    durationDays: 3,
    owner: 'Eva Lin',
    ownerInitial: 'E',
    status: 'blocked',
    description: 'Studio VO sessions with principal cast. Blocked on contract signatures.',
    dueDate: '2026-04-08',
    dependsOn: ['t4'],
  },
  {
    id: 't6',
    name: 'Layout & Blocking',
    durationDays: 8,
    owner: 'Frank Wu',
    ownerInitial: 'F',
    status: 'pending',
    description: '3D scene layout, camera blocking, and rough motion.',
    dueDate: '2026-04-14',
    dependsOn: ['t3', 't4'],
  },
  {
    id: 't7',
    name: 'Animation',
    durationDays: 14,
    owner: 'Grace Kim',
    ownerInitial: 'G',
    status: 'pending',
    description: 'Full keyframe + spline animation pass across all shots.',
    dueDate: '2026-04-28',
    dependsOn: ['t6', 't5'],
  },
  {
    id: 't8',
    name: 'Rough Cut',
    durationDays: 4,
    owner: 'Hiro Tanaka',
    ownerInitial: 'H',
    status: 'pending',
    description: 'Editorial rough cut with temp FX and music.',
    dueDate: '2026-05-02',
    dependsOn: ['t7'],
  },
  {
    id: 't9',
    name: 'Sound Design',
    durationDays: 5,
    owner: 'Iris Vega',
    ownerInitial: 'I',
    status: 'pending',
    description: 'Full sound design, foley, and music integration.',
    dueDate: '2026-05-07',
    dependsOn: ['t8'],
  },
  {
    id: 't10',
    name: 'Final Cut',
    durationDays: 3,
    owner: 'Alice Chen',
    ownerInitial: 'A',
    status: 'pending',
    description: 'Color grade, final mix, and master delivery.',
    dueDate: '2026-05-10',
    dependsOn: ['t9'],
  },
];

// Critical path: longest chain of dependencies
const CRITICAL_PATH = new Set(['t1', 't2', 't3', 't6', 't7', 't8', 't9', 't10']);

// ══════════════════════════════════════════════════════════════
// LAYOUT
// ══════════════════════════════════════════════════════════════

const BOX_W = 180;
const BOX_H = 60;
const COL_GAP = 80;
const ROW_GAP = 30;
const PAD_X = 40;
const PAD_Y = 40;

function computeLayout(tasks: Task[]): PositionedTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map<string, number>();

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const t = byId.get(id);
    if (!t || t.dependsOn.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...t.dependsOn.map(getDepth));
    depth.set(id, d);
    return d;
  }

  tasks.forEach((t) => getDepth(t.id));

  const columns = new Map<number, Task[]>();
  tasks.forEach((t) => {
    const d = depth.get(t.id)!;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(t);
  });

  const positioned: PositionedTask[] = [];
  columns.forEach((colTasks, col) => {
    colTasks.forEach((t, row) => {
      positioned.push({
        ...t,
        column: col,
        x: PAD_X + col * (BOX_W + COL_GAP),
        y: PAD_Y + row * (BOX_H + ROW_GAP),
      });
    });
  });

  return positioned;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function statusColor(status: TaskStatus): { fill: string; stroke: string; label: string } {
  switch (status) {
    case 'done':
      return { fill: 'rgba(34,197,94,0.15)', stroke: '#22c55e', label: 'Done' };
    case 'in_progress':
      return { fill: 'rgba(168,85,247,0.15)', stroke: '#a855f7', label: 'In Progress' };
    case 'blocked':
      return { fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', label: 'Blocked' };
    case 'pending':
    default:
      return { fill: 'rgba(148,163,184,0.15)', stroke: '#94a3b8', label: 'Pending' };
  }
}

function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function DependencyGraph() {
  const [selected, setSelected] = useState<PositionedTask | null>(null);

  const positioned = useMemo(() => computeLayout(MOCK_TASKS), []);
  const byId = useMemo(
    () => new Map(positioned.map((t) => [t.id, t])),
    [positioned]
  );

  const maxCol = Math.max(...positioned.map((t) => t.column));
  const maxRow = Math.max(
    ...Array.from(
      positioned.reduce((m, t) => {
        m.set(t.column, (m.get(t.column) ?? 0) + 1);
        return m;
      }, new Map<number, number>()).values()
    )
  );

  const width = PAD_X * 2 + (maxCol + 1) * BOX_W + maxCol * COL_GAP;
  const height = PAD_Y * 2 + maxRow * BOX_H + (maxRow - 1) * ROW_GAP;

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--surface, #0f0f14)',
        border: '1px solid var(--border, #26263a)',
        borderRadius: 12,
        overflow: 'auto',
        padding: 8,
      }}
    >
      <svg
        width={width}
        height={height}
        style={{ display: 'block', minWidth: '100%' }}
        role="img"
        aria-label="Task dependency graph"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted, #94a3b8)" />
          </marker>
          <marker
            id="arrow-critical"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Dependency arrows */}
        {positioned.map((task) =>
          task.dependsOn.map((depId) => {
            const from = byId.get(depId);
            if (!from) return null;
            const x1 = from.x + BOX_W;
            const y1 = from.y + BOX_H / 2;
            const x2 = task.x;
            const y2 = task.y + BOX_H / 2;
            const critical =
              CRITICAL_PATH.has(depId) && CRITICAL_PATH.has(task.id);
            return (
              <path
                key={`${depId}-${task.id}`}
                d={arrowPath(x1, y1, x2, y2)}
                fill="none"
                stroke={critical ? '#ef4444' : 'var(--text-muted, #94a3b8)'}
                strokeWidth={critical ? 2.5 : 1.5}
                markerEnd={critical ? 'url(#arrow-critical)' : 'url(#arrow)'}
                opacity={0.85}
              />
            );
          })
        )}

        {/* Task boxes */}
        {positioned.map((task) => {
          const c = statusColor(task.status);
          const critical = CRITICAL_PATH.has(task.id);
          return (
            <g
              key={task.id}
              transform={`translate(${task.x}, ${task.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(task)}
            >
              <rect
                width={BOX_W}
                height={BOX_H}
                rx={10}
                ry={10}
                fill={c.fill}
                stroke={critical ? '#ef4444' : c.stroke}
                strokeWidth={critical ? 3 : 1.5}
              />
              <text
                x={14}
                y={22}
                fill="var(--text, #f1f5f9)"
                fontSize={13}
                fontWeight={600}
              >
                {task.name}
              </text>
              <text
                x={14}
                y={42}
                fill="var(--text-muted, #94a3b8)"
                fontSize={11}
              >
                {task.durationDays}d · {c.label}
              </text>
              {/* Owner avatar */}
              <circle
                cx={BOX_W - 20}
                cy={BOX_H / 2}
                r={13}
                fill="var(--accent, #a855f7)"
              />
              <text
                x={BOX_W - 20}
                y={BOX_H / 2 + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={12}
                fontWeight={700}
              >
                {task.ownerInitial}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 16px',
          borderTop: '1px solid var(--border, #26263a)',
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'var(--text-muted, #94a3b8)',
        }}
      >
        {(['done', 'in_progress', 'blocked', 'pending'] as TaskStatus[]).map(
          (s) => {
            const c = statusColor(s);
            return (
              <span
                key={s}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: c.fill,
                    border: `1.5px solid ${c.stroke}`,
                  }}
                />
                {c.label}
              </span>
            );
          }
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 18,
              height: 3,
              background: '#ef4444',
              borderRadius: 2,
            }}
          />
          Critical Path
        </span>
      </div>

      {/* Detail popover */}
      {selected && (
        <div
          role="dialog"
          aria-label={`Task details: ${selected.name}`}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 300,
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: 'var(--text, #f1f5f9)',
              }}
            >
              {selected.name}
            </h3>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted, #94a3b8)',
              margin: '0 0 12px',
              lineHeight: 1.5,
            }}
          >
            {selected.description}
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <UserIcon size={14} /> {selected.owner}
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <CalendarIcon size={14} /> Due {selected.dueDate}
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Clock size={14} /> {selected.durationDays} days
            </div>
          </div>
          <button
            type="button"
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: 'var(--accent, #a855f7)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <Edit3 size={14} /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

export { MOCK_TASKS, CRITICAL_PATH };
