'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGeneration, estimateCost } from '@/hooks/useGeneration';
import { QualityReport } from './QualityReport';
import type { GenerationTier, SceneGraph } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tier definitions                                                   */
/* ------------------------------------------------------------------ */

const TIERS: {
  value: GenerationTier;
  label: string;
  desc: string;
  credits: number;
}[] = [
  { value: 'draft', label: 'Preview', desc: 'Fast, low-res', credits: 1 },
  { value: 'standard', label: 'Standard', desc: '1080p', credits: 5 },
  { value: 'premium', label: 'Final', desc: '4K max fidelity', credits: 12 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function stageLabel(stage: string | null): string {
  switch (stage) {
    case 'queued':
      return 'Queued';
    case 'preprocessing':
      return 'Preprocessing';
    case 'generating':
      return 'Core Generation';
    case 'post-processing':
      return 'Post-Processing';
    case 'finalizing':
      return 'Finalizing';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return 'Waiting...';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface GenerationPanelProps {
  shotId: string;
  sceneGraph?: SceneGraph;
}

export function GenerationPanel({ shotId, sceneGraph }: GenerationPanelProps) {
  const [tier, setTier] = useState<GenerationTier>('standard');

  const {
    generate,
    cancel,
    isGenerating,
    progress,
    stage,
    result,
    error,
    balance,
    checkBalance,
    elapsedRef,
  } = useGeneration();

  const cost = estimateCost(tier);
  const insufficientCredits = balance !== null && balance < cost;

  /* Fetch balance on mount and when tier changes */
  useEffect(() => {
    checkBalance().catch(() => {});
  }, [checkBalance]);

  /* Elapsed time display - re-render every second while generating */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [isGenerating, elapsedRef]);

  const handleGenerate = useCallback(() => {
    generate(shotId, tier, sceneGraph);
  }, [generate, shotId, tier, sceneGraph]);

  const handleRegenerate = useCallback(() => {
    generate(shotId, tier, sceneGraph);
  }, [generate, shotId, tier, sceneGraph]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Generation Controls
      </h3>

      {/* Tier Selector */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tier-select" className="text-xs font-medium text-zinc-500">
          Quality Tier
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTier(t.value)}
              disabled={isGenerating}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                tier === t.value
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="text-[10px] text-zinc-500">{t.desc}</span>
              <span className="mt-0.5 text-xs font-bold text-zinc-300">
                {t.credits} {t.credits === 1 ? 'credit' : 'credits'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
        <span className="text-xs text-zinc-500">Estimated cost</span>
        <span className="text-sm font-semibold text-zinc-200">
          {cost} {cost === 1 ? 'credit' : 'credits'}
        </span>
      </div>

      {balance !== null && (
        <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
          <span className="text-xs text-zinc-500">
            This will cost {cost} {cost === 1 ? 'credit' : 'credits'}. You have{' '}
            {balance} remaining.
          </span>
        </div>
      )}

      {/* Insufficient Credits Warning */}
      {insufficientCredits && (
        <div className="flex items-center justify-between rounded-lg border border-amber-800 bg-amber-900/30 px-3 py-2">
          <span className="text-xs text-amber-400">Insufficient credits</span>
          <a
            href="/billing/top-up"
            className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-500"
          >
            Top Up
          </a>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || insufficientCredits || !shotId}
        className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>

      {/* Progress Section */}
      {isGenerating && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">{stageLabel(stage)}</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">
              Elapsed: {formatElapsed(elapsed)}
            </span>
            <button
              onClick={() => cancel()}
              className="rounded bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:bg-red-600 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result Section */}
      {result && !isGenerating && (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-800 bg-emerald-900/20 p-3">
          {/* Video preview placeholder */}
          <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
            <video
              src={result.outputUrl}
              controls
              className="h-full w-full rounded-lg object-contain"
              poster="/placeholder-video.png"
            />
          </div>

          {/* Quality scores */}
          <QualityReport scores={result.qualityScores} />

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500">
              Use This
            </button>
            <button
              onClick={handleRegenerate}
              className="flex-1 rounded-lg bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-600"
            >
              Regenerate
            </button>
            <a
              href={result.outputUrl}
              download
              className="flex items-center justify-center rounded-lg bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-600"
            >
              Download
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-400">
          Error: {error}
        </div>
      )}
    </div>
  );
}
