'use client';

import { useMemo } from 'react';
import type { MemorySuggestions as MemorySuggestionsData } from '../../lib/ai/generative-memory';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface MemorySuggestionsProps {
  suggestions: MemorySuggestionsData;
  onSelectCamera?: (cameraType: string) => void;
  onSelectDuration?: (durationSec: number) => void;
  onSelectMotion?: (motionStyle: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MemorySuggestions({
  suggestions,
  onSelectCamera,
  onSelectDuration,
  onSelectMotion,
}: MemorySuggestionsProps) {
  const { suggestedCamera, suggestedDuration, suggestedMotion } = suggestions;

  const hasSuggestions = useMemo(
    () => suggestedCamera.length > 0 || suggestedDuration.avg > 0 || suggestedMotion !== 'static',
    [suggestedCamera, suggestedDuration, suggestedMotion],
  );

  if (!hasSuggestions) return null;

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/60 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-violet-400">
          Based on your history
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Camera suggestions */}
      {suggestedCamera.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Camera</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedCamera.map(({ type, percentage }) => (
              <button
                key={type}
                onClick={() => onSelectCamera?.(type)}
                className="group flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-300"
              >
                <span>{type}</span>
                <span className="text-[9px] text-zinc-500 group-hover:text-violet-400">
                  {percentage}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duration suggestion */}
      {suggestedDuration.avg > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Duration</span>
          <button
            onClick={() => onSelectDuration?.(suggestedDuration.avg)}
            className="flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-300"
          >
            <span>
              {suggestedDuration.min}s &ndash; {suggestedDuration.max}s
            </span>
            <span className="text-[9px] text-zinc-500">avg {suggestedDuration.avg}s</span>
          </button>
        </div>
      )}

      {/* Motion suggestion */}
      {suggestedMotion !== 'static' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Motion</span>
          <button
            onClick={() => onSelectMotion?.(suggestedMotion)}
            className="flex w-fit items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-300"
          >
            <span>{suggestedMotion}</span>
          </button>
        </div>
      )}
    </div>
  );
}
