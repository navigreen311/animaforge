'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

const STATS: StatCard[] = [
  {
    label: 'Total Generations',
    value: '1,248',
    change: '+12.5%',
    positive: true,
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    label: 'Credits Used',
    value: '8,432',
    change: '+8.2%',
    positive: false,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Avg Quality Score',
    value: '94.2',
    change: '+2.1%',
    positive: true,
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    label: 'Total Duration',
    value: '47m 32s',
    change: '+18.7%',
    positive: true,
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

interface BarData {
  label: string;
  value: number;
  color: string;
}

const WEEKLY_DATA: BarData[] = [
  { label: 'Mon', value: 42, color: 'bg-violet-500' },
  { label: 'Tue', value: 68, color: 'bg-violet-500' },
  { label: 'Wed', value: 55, color: 'bg-violet-500' },
  { label: 'Thu', value: 91, color: 'bg-violet-500' },
  { label: 'Fri', value: 78, color: 'bg-violet-500' },
  { label: 'Sat', value: 34, color: 'bg-violet-400' },
  { label: 'Sun', value: 22, color: 'bg-violet-400' },
];

const MONTHLY_DATA: BarData[] = [
  { label: 'Oct', value: 320, color: 'bg-violet-500' },
  { label: 'Nov', value: 480, color: 'bg-violet-500' },
  { label: 'Dec', value: 390, color: 'bg-violet-500' },
  { label: 'Jan', value: 520, color: 'bg-violet-500' },
  { label: 'Feb', value: 610, color: 'bg-violet-500' },
  { label: 'Mar', value: 748, color: 'bg-violet-400' },
];

interface StyleRank {
  name: string;
  count: number;
  percentage: number;
}

const TOP_STYLES: StyleRank[] = [
  { name: 'Cinematic Realism', count: 312, percentage: 25 },
  { name: 'Anime Cel Shade', count: 284, percentage: 23 },
  { name: 'Cyberpunk Neon', count: 198, percentage: 16 },
  { name: 'Watercolor Dream', count: 156, percentage: 12 },
  { name: 'Pixel Retro', count: 124, percentage: 10 },
  { name: 'Oil Painting', count: 98, percentage: 8 },
  { name: 'Other', count: 76, percentage: 6 },
];

type ChartPeriod = 'weekly' | 'monthly';

export default function AnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [period, setPeriod] = useState<ChartPeriod>('weekly');

  const chartData = period === 'weekly' ? WEEKLY_DATA : MONTHLY_DATA;
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
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="p-2 rounded-lg bg-gray-800">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
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
