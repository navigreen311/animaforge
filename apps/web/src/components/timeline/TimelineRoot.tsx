'use client';

import { useState } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineViewport } from './TimelineViewport';
import { ShotInspector } from './ShotInspector';
import { CollabPresence } from './CollabPresence';

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export type ShotStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'generating';

export interface Shot {
  id: string;
  number: number;
  subject: string;
  camera: string;
  action: string;
  emotion: string;
  timing: string;
  dialogue: string;
  durationSec: number;
  status: ShotStatus;
  characterRefs: string[];
  styleRef: string;
  thumbnailUrl?: string;
}

export interface AudioTrack {
  id: string;
  label: string;
  durationSec: number;
  /** Normalized waveform amplitudes (0-1) for mock display */
  waveform: number[];
}

export type ToolMode = 'select' | 'trim' | 'split';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineRootProps {
  shots: Shot[];
  audioTracks: AudioTrack[];
  collaborators?: Collaborator[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelineRoot({ shots, audioTracks, collaborators = [] }: TimelineRootProps) {
  const [zoom, setZoom] = useState(100);
  const [snap, setSnap] = useState(true);
  const [mode, setMode] = useState<ToolMode>('select');
  const [playing, setPlaying] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  const selectedShot = shots.find((s) => s.id === selectedShotId) ?? null;

  return (
    <div className="relative flex h-full w-full flex-col bg-zinc-950 text-zinc-100">
      {/* Collaboration presence overlay */}
      {collaborators.length > 0 && <CollabPresence collaborators={collaborators} />}

      {/* Toolbar */}
      <TimelineToolbar
        playing={playing}
        onPlayPause={() => setPlaying((p) => !p)}
        zoom={zoom}
        onZoomChange={setZoom}
        snap={snap}
        onSnapToggle={() => setSnap((s) => !s)}
        mode={mode}
        onModeChange={setMode}
        onAddShot={() => {/* stub */}}
      />

      {/* Main content: viewport + inspector */}
      <div className="flex flex-1 overflow-hidden">
        <TimelineViewport
          shots={shots}
          audioTracks={audioTracks}
          zoom={zoom}
          playing={playing}
          selectedShotId={selectedShotId}
          onSelectShot={setSelectedShotId}
        />

        {/* Inspector right panel */}
        <ShotInspector
          shot={selectedShot}
          onEdit={() => {/* stub */}}
          onGenerate={() => {/* stub */}}
        />
      </div>
    </div>
  );
}
