'use client';

import { useRef } from 'react';
import type { Shot, AudioTrack } from './TimelineRoot';
import { ShotTrack } from './ShotTrack';
import { AudioTrackRow } from './AudioTrack';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineViewportProps {
  shots: Shot[];
  audioTracks: AudioTrack[];
  zoom: number;
  playing: boolean;
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Pixels per second at the current zoom level */
function pxPerSec(zoom: number): number {
  return (zoom / 100) * 80;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineViewport({
  shots,
  audioTracks,
  zoom,
  playing,
  selectedShotId,
  onSelectShot,
}: TimelineViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scale = pxPerSec(zoom);

  // Total duration for the ruler
  const totalDuration = Math.max(
    shots.reduce((acc, s) => acc + s.durationSec, 0),
    ...audioTracks.map((t) => t.durationSec),
    30, // minimum 30s visible
  );
  const totalWidth = totalDuration * scale;

  // Build ruler marks (every second)
  const rulerMarks: number[] = [];
  for (let i = 0; i <= totalDuration; i++) {
    rulerMarks.push(i);
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-auto">
        {/* Time ruler */}
        <div
          className="sticky top-0 z-10 flex h-6 border-b border-zinc-800 bg-zinc-900"
          style={{ width: totalWidth }}
        >
          {rulerMarks.map((sec) => (
            <div
              key={sec}
              className="relative shrink-0 border-r border-zinc-800"
              style={{ width: scale }}
            >
              <span className="absolute left-1 top-0.5 text-[10px] text-zinc-500">
                {sec}s
              </span>
            </div>
          ))}
        </div>

        {/* Shot track */}
        <ShotTrack
          shots={shots}
          scale={scale}
          selectedShotId={selectedShotId}
          onSelectShot={onSelectShot}
        />

        {/* Audio tracks */}
        {audioTracks.map((track) => (
          <AudioTrackRow key={track.id} track={track} scale={scale} />
        ))}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-red-500"
          style={{ left: playing ? '50%' : 0 }}
        />
      </div>
    </div>
  );
}
