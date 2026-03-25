'use client';

import type { AudioTrack } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AudioTrackRowProps {
  track: AudioTrack;
  scale: number; // px per second
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AudioTrackRow({ track, scale }: AudioTrackRowProps) {
  const totalWidth = track.durationSec * scale;

  return (
    <div className="flex h-14 items-stretch border-b border-zinc-800">
      {/* Track label */}
      <div className="flex w-28 shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-400">
        {track.label}
      </div>

      {/* Waveform mock */}
      <div
        className="flex items-end gap-px bg-zinc-900/50 px-0.5 py-1"
        style={{ width: totalWidth }}
      >
        {track.waveform.map((amp, i) => (
          <div
            key={i}
            className="w-1 shrink-0 rounded-t bg-cyan-500/70"
            style={{ height: `${Math.max(amp * 100, 4)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
