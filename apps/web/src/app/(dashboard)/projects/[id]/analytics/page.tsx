'use client';

import { useState, useMemo } from 'react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import { useParams } from 'next/navigation';

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface StyleRank {
  name: string;
  count: number;
  percentage: number;
}

type ChartPeriod = 'weekly' | 'monthly';

/** The shape GET /api/analytics/project/[id] returns. */
interface ProjectAnalytics {
  projectId: string;
  title: string;
  scenes: number;
  shots: number;
  generations: number;
  byStatus: Record<string, number>;
}

const ICON_BOLT = 'M13 10V3L4 14h7v7l9-11h-7z';
const ICON_FILM =
  'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z';
const ICON_CHECK = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
const ICON_X = 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';

/**
 * Build the stat row from real counts.
 *
 * The previous cards carried a percentage change per stat. Nothing records a
 * previous period, so there is no change to compute and the cards no longer
 * claim one — a made-up "+12.5%" is worse than no trend at all.
 */
function toStats(a: ProjectAnalytics): StatCard[] {
  return [
    {
      label: 'Generations',
      value: String(a.generations),
      change: '',
      positive: true,
      icon: ICON_BOLT,
    },
    { label: 'Scenes', value: String(a.scenes), change: '', positive: true, icon: ICON_FILM },
    {
      label: 'Completed',
      value: String(a.byStatus.complete ?? 0),
      change: '',
      positive: true,
      icon: ICON_CHECK,
    },
    {
      label: 'Failed',
      value: String(a.byStatus.failed ?? 0),
      change: '',
      positive: false,
      icon: ICON_X,
    },
  ];
}

export default function AnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [period, setPeriod] = useState<ChartPeriod>('weekly');

  const state = useResource<ProjectAnalytics>(`/api/analytics/project/${params.id}`, [params.id]);
  const STATS = useMemo(() => (state.data ? toStats(state.data) : []), [state.data]);

  /**
   * Generation counts over time are not recorded per period: GenerationJob has
   * a createdAt but the endpoint returns totals, so there is no series to plot.
   * The chart renders empty rather than showing a shape nothing produced.
   */
  const chartData: BarData[] = [];
  const TOP_STYLES: StyleRank[] = [];
  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Project {params.id} &mdash; Generation metrics and usage insights
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="p-2 rounded-lg bg-gray-800">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={stat.icon}
                  />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
              {stat.change} from last period
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-200">Generations Over Time</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === 'weekly'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === 'monthly'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* CSS bar chart */}
          <div className="flex items-end gap-3 h-48">
            {chartData.map((bar) => {
              const heightPct = Math.round((bar.value / maxValue) * 100);
              return (
                <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-400">{bar.value}</span>
                  <div className="w-full relative" style={{ height: '160px' }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t-md ${bar.color} transition-all duration-500`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top styles */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Top Styles</h2>
          <div className="space-y-3">
            {TOP_STYLES.map((style, idx) => (
              <div key={style.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">
                    <span className="text-gray-600 mr-2">{idx + 1}.</span>
                    {style.name}
                  </span>
                  <span className="text-xs text-gray-500">{style.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${style.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
