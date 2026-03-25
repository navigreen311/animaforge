'use client';

import type { Shot, ShotStatus } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ShotTrackProps {
  shots: Shot[];
  scale: number; // px per second
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<ShotStatus, string> = {
  draft: 'bg-zinc-700',
  pending: 'bg-amber-700',
  approved: 'bg-emerald-700',
  rejected: 'bg-red-700',
  generating: 'bg-violet-700',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ShotTrack({ shots, scale, selectedShotId, onSelectShot }: ShotTrackProps) {
  return (
    <div className="flex h-20 items-stretch border-b border-zinc-800">
      {/* Track label */}
      <div className="flex w-28 shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-400">
        Shots
      </div>

      {/* Shot blocks */}
      <div className="flex items-stretch">
        {shots.map((shot) => {
          const widthPx = shot.durationSec * scale;
          const isSelected = shot.id === selectedShotId;

          return (
            <button
              key={shot.id}
              onClick={() => onSelectShot(shot.id)}
              className={`relative flex shrink-0 flex-col justify-between overflow-hidden border-r border-zinc-900 p-1.5 ${
                STATUS_COLORS[shot.status]
              } ${isSelected ? 'ring-2 ring-violet-400' : ''}`}
              style={{ width: widthPx }}
            >
              {/* Thumbnail placeholder */}
              <div className="h-8 w-full rounded-sm bg-black/20" />

              {/* Info row */}
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  #{shot.number}
                </span>
                <span className="text-[10px] text-white/60">
                  {shot.durationSec}s
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
