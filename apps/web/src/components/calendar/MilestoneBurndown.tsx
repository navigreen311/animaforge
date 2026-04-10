'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle2, Target } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// MOCK DATA (30 days)
// ══════════════════════════════════════════════════════════════

const START_TASKS = 25;
const DAYS = 30;
const CURRENT_DAY = 14;

interface BurndownPoint {
  day: number;
  date: string;
  planned: number;
  actual: number | null;
}

function generateBurndownData(): BurndownPoint[] {
  const data: BurndownPoint[] = [];
  const start = new Date('2026-03-26');
  for (let i = 0; i <= DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

    const planned = Math.max(0, START_TASKS - (START_TASKS * i) / DAYS);

    let actual: number | null = null;
    if (i <= CURRENT_DAY) {
      // Slightly behind planned in early days, caught up mid-sprint
      const drift = Math.sin(i / 3) * 1.5 + (i < 7 ? 1.2 : -0.3);
      actual = Math.max(0, Math.round((START_TASKS - (START_TASKS * i) / DAYS) + drift));
    }

    data.push({
      day: i,
      date: dateStr,
      planned: Math.round(planned * 10) / 10,
      actual,
    });
  }
  return data;
}

const MOCK_DATA = generateBurndownData();

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function MilestoneBurndown() {
  const currentPoint = MOCK_DATA[CURRENT_DAY];
  const prevPoint = MOCK_DATA[CURRENT_DAY - 1];

  const stats = useMemo(() => {
    const tasksDone =
      START_TASKS - (currentPoint.actual ?? START_TASKS);
    const velocity = tasksDone / CURRENT_DAY;
    const remaining = currentPoint.actual ?? 0;
    const daysToComplete = velocity > 0 ? Math.ceil(remaining / velocity) : Infinity;

    const forecastDate = new Date('2026-03-26');
    forecastDate.setDate(forecastDate.getDate() + CURRENT_DAY + daysToComplete);
    const forecastStr = `${forecastDate.getMonth() + 1}/${forecastDate.getDate()}`;

    const plannedRemainingNow = currentPoint.planned;
    const actualRemainingNow = currentPoint.actual ?? 0;
    const delta = actualRemainingNow - plannedRemainingNow;
    const onTrack = delta <= 1;

    return {
      velocity: Math.round(velocity * 10) / 10,
      forecastStr,
      onTrack,
      delta: Math.round(delta * 10) / 10,
      remaining,
    };
  }, [currentPoint]);

  const currentDateLabel = currentPoint.date;

  return (
    <div
      style={{
        background: 'var(--surface, #0f0f14)',
        border: '1px solid var(--border, #26263a)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={MOCK_DATA}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid stroke="var(--border, #26263a)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted, #94a3b8)"
              fontSize={11}
              interval={3}
            />
            <YAxis
              stroke="var(--text-muted, #94a3b8)"
              fontSize={11}
              domain={[0, START_TASKS]}
              label={{
                value: 'Tasks remaining',
                angle: -90,
                position: 'insideLeft',
                style: {
                  fill: 'var(--text-muted, #94a3b8)',
                  fontSize: 11,
                },
              }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-elevated, #17172b)',
                border: '1px solid var(--border, #26263a)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine
              x={currentDateLabel}
              stroke="#eab308"
              strokeDasharray="4 4"
              label={{
                value: 'Today',
                fill: '#eab308',
                fontSize: 11,
                position: 'top',
              }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              name="Planned"
              stroke="#94a3b8"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#a855f7' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {/* On-track badge */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: stats.onTrack
              ? 'rgba(34,197,94,0.1)'
              : 'rgba(239,68,68,0.1)',
            border: `1px solid ${stats.onTrack ? '#22c55e' : '#ef4444'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-muted, #94a3b8)',
              marginBottom: 6,
            }}
          >
            {stats.onTrack ? (
              <CheckCircle2 size={12} color="#22c55e" />
            ) : (
              <AlertTriangle size={12} color="#ef4444" />
            )}
            Status
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: stats.onTrack ? '#22c55e' : '#ef4444',
            }}
          >
            {stats.onTrack ? 'On Track' : `Behind by ${Math.abs(stats.delta)}`}
          </div>
        </div>

        {/* Velocity */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-muted, #94a3b8)',
              marginBottom: 6,
            }}
          >
            <TrendingDown size={12} /> Velocity
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            {stats.velocity} tasks/day
          </div>
        </div>

        {/* Forecast */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-muted, #94a3b8)',
              marginBottom: 6,
            }}
          >
            <Target size={12} /> Forecast
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text, #f1f5f9)',
            }}
          >
            {stats.forecastStr}
          </div>
        </div>

        {/* Risk */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-elevated, #17172b)',
            border: '1px solid var(--border, #26263a)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-muted, #94a3b8)',
              marginBottom: 6,
            }}
          >
            <AlertTriangle size={12} color="#eab308" /> Risk
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#eab308',
            }}
          >
            VO contracts pending
          </div>
        </div>
      </div>
    </div>
  );
}
