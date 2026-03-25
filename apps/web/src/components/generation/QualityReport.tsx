'use client';

import type { QualityScores } from '@/types';

/* ------------------------------------------------------------------ */
/*  Thresholds & scoring logic                                         */
/* ------------------------------------------------------------------ */

interface MetricConfig {
  label: string;
  unit: string;
  format: (value: number) => string;
  barPercent: (value: number) => number;
  isGood: (value: number) => boolean;
}

const METRICS: Record<keyof QualityScores, MetricConfig> = {
  flicker: {
    label: 'Temporal Stability',
    unit: '',
    format: (v) => (v * 100).toFixed(0),
    barPercent: (v) => v * 100,
    isGood: (v) => v > 0.85,
  },
  identityDrift: {
    label: 'Identity Consistency',
    unit: '',
    format: (v) => v.toFixed(3),
    barPercent: (v) => Math.min(v * 1000, 100),
    isGood: (v) => v < 0.05,
  },
  loudness: {
    label: 'Audio Sync (lip-sync)',
    unit: 'ms',
    format: (v) => `${Math.round(v * 100)}`,
    barPercent: (v) => v * 100,
    isGood: (v) => v * 100 < 30,
  },
  artifacts: {
    label: 'Artifact Detection',
    unit: 'artifacts',
    format: (v) => `${Math.round(v * 10)}`,
    barPercent: (v) => Math.min(v * 100, 100),
    isGood: (v) => Math.round(v * 10) === 0,
  },
};

type Verdict = 'PASS' | 'REVIEW' | 'FAIL';

function computeVerdict(scores: QualityScores): Verdict {
  const results = (Object.keys(METRICS) as (keyof QualityScores)[]).map(
    (key) => METRICS[key].isGood(scores[key]),
  );
  const passing = results.filter(Boolean).length;

  if (passing === results.length) return 'PASS';
  if (passing >= results.length - 1) return 'REVIEW';
  return 'FAIL';
}

function verdictStyle(verdict: Verdict): string {
  switch (verdict) {
    case 'PASS':
      return 'bg-emerald-600 text-emerald-100';
    case 'REVIEW':
      return 'bg-amber-600 text-amber-100';
    case 'FAIL':
      return 'bg-red-600 text-red-100';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface QualityReportProps {
  scores: QualityScores;
  onRequestQC?: () => void;
}

export function QualityReport({ scores, onRequestQC }: QualityReportProps) {
  const verdict = computeVerdict(scores);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Quality Report
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${verdictStyle(verdict)}`}
        >
          {verdict}
        </span>
      </div>

      {/* Metric rows */}
      <ul className="flex flex-col gap-2">
        {(Object.keys(METRICS) as (keyof QualityScores)[]).map((key) => {
          const config = METRICS[key];
          const value = scores[key];
          const good = config.isGood(value);

          return (
            <li
              key={key}
              className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    good ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  aria-label={good ? 'Good' : 'Needs attention'}
                />
                <span className="text-xs font-medium text-zinc-300">
                  {config.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      good ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${config.barPercent(value)}%` }}
                  />
                </div>
                <span
                  className={`min-w-[4ch] text-right text-xs font-semibold ${
                    good ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {config.format(value)}
                  {config.unit ? ` ${config.unit}` : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Manual QC button for borderline results */}
      {verdict === 'REVIEW' && (
        <button
          onClick={onRequestQC}
          className="mt-1 rounded-lg border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-900/50"
        >
          Request Manual QC
        </button>
      )}
    </div>
  );
}
