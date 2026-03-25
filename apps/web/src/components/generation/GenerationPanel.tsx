'use client';

import { useState } from 'react';
import { useGeneration, costEstimate } from '@/hooks/useGeneration';
import type { GenerationTier } from '@/types';

const TIERS: { value: GenerationTier; label: string; desc: string }[] = [
  { value: 'draft', label: 'Draft', desc: 'Fast preview, lower quality' },
  { value: 'standard', label: 'Standard', desc: 'Balanced quality & speed' },
  { value: 'premium', label: 'Premium', desc: 'Maximum fidelity' },
];

function stageLabel(progress: number): string {
  if (progress <= 0) return 'Queued';
  if (progress <= 15) return 'Preprocessing...';
  if (progress <= 50) return 'Generating...';
  if (progress <= 75) return 'Post-processing...';
  if (progress <= 90) return 'Finalizing...';
  return 'Complete';
}

interface GenerationPanelProps {
  shotId: string;
}

export function GenerationPanel({ shotId }: GenerationPanelProps) {
  const [tier, setTier] = useState<GenerationTier>('standard');
  const { generate, isGenerating, progress, result, error } = useGeneration();

  const cost = costEstimate(tier);

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
        <select
          id="tier-select"
          value={tier}
          onChange={(e) => setTier(e.target.value as GenerationTier)}
          disabled={isGenerating}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-500 disabled:opacity-50"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} — {t.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Cost Estimate */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
        <span className="text-xs text-zinc-500">Estimated cost</span>
        <span className="text-sm font-semibold text-zinc-200">
          ${cost.toFixed(2)}
        </span>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => generate(shotId, tier)}
        disabled={isGenerating}
        className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{stageLabel(progress)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && !isGenerating && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 px-3 py-2 text-xs text-emerald-400">
          Generation complete: {result}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-400">
          Error: {error}
        </div>
      )}
    </div>
  );
}
