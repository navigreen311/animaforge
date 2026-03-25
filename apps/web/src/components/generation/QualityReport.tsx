'use client';

import type { QualityScores } from '@/types';

const THRESHOLDS: Record<keyof QualityScores, { good: number; invert: boolean }> = {
  flicker: { good: 0.8, invert: true },
  identityDrift: { good: 0.85, invert: true },
  loudness: { good: 0.7, invert: false },
  artifacts: { good: 0.8, invert: true },
};

const LABELS: Record<keyof QualityScores, string> = {
  flicker: 'Flicker',
  identityDrift: 'Identity Drift',
  loudness: 'Loudness',
  artifacts: 'Artifacts',
};

function isGood(key: keyof QualityScores, value: number): boolean {
  const t = THRESHOLDS[key];
  return t.invert ? value <= (1 - t.good) : value >= t.good;
}

interface QualityReportProps {
  scores: QualityScores;
}

export function QualityReport({ scores }: QualityReportProps) {
  const entries = (Object.keys(scores) as (keyof QualityScores)[]).map(
    (key) => ({
      key,
      label: LABELS[key],
      value: scores[key],
      good: isGood(key, scores[key]),
    }),
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Quality Report
      </h3>
      <ul className="flex flex-col gap-2">
        {entries.map(({ key, label, value, good }) => (
          <li
            key={key}
            className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${good ? 'bg-emerald-500' : 'bg-red-500'}`}
                aria-label={good ? 'Good' : 'Needs attention'}
              />
              <span className="text-xs font-medium text-zinc-300">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${good ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
              </div>
              <span className={`min-w-[3ch] text-right text-xs font-semibold ${good ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.round(value * 100)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
