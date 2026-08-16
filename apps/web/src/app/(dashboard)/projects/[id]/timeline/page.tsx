'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { TimelineRoot } from '@/components/timeline';
import type { Shot, AudioTrack, Collaborator, ShotStatus } from '@/components/timeline';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

/** One row of GET /api/projects/[id]/shots. */
interface ShotRow {
  id: string;
  sceneId: string;
  shotNumber: number;
  prompt: string | null;
  status: string;
  durationMs: number | null;
  aspectRatio: string;
}

/** One row of GET /api/audio/tracks. */
interface AudioRow {
  id: string;
  name: string;
  duration: number | null;
}

const SHOT_STATUSES: ShotStatus[] = ['draft', 'pending', 'approved', 'rejected', 'generating'];

function formatTiming(startSec: number, durationSec: number): string {
  const stamp = (t: number) =>
    `${Math.floor(t / 60)}:${Math.floor(t % 60)
      .toString()
      .padStart(2, '0')}`;
  return `${stamp(startSec)} - ${stamp(startSec + durationSec)}`;
}

/**
 * Map a stored shot onto the timeline clip.
 *
 * The mock rows this replaces carried a subject, a camera instruction, an
 * action, an emotion and a dialogue line per shot. A shot row has a prompt, a
 * scene graph, a status and a duration — the individual craft fields are not
 * columns, so `subject` shows the prompt and camera, action, emotion and
 * dialogue are left blank rather than split out of a prompt that may say
 * nothing about them.
 */
function toShot(row: ShotRow, startSec: number): Shot {
  const durationSec = row.durationMs === null ? 0 : Math.round(row.durationMs / 1000);
  return {
    id: row.id,
    number: row.shotNumber,
    subject: row.prompt ?? `Shot ${row.shotNumber}`,
    camera: '',
    action: '',
    emotion: '',
    timing: formatTiming(startSec, durationSec),
    dialogue: '',
    durationSec,
    status: SHOT_STATUSES.includes(row.status as ShotStatus)
      ? (row.status as ShotStatus)
      : 'draft',
    characterRefs: [],
    styleRef: '',
  };
}

export default function TimelinePage() {
  const params = useParams<{ id: string }>();

  const shotState = useResource<{ items: ShotRow[] }>(`/api/projects/${params.id}/shots`, [
    params.id,
  ]);
  const audioState = useResource<{ items: AudioRow[] }>('/api/audio/tracks');

  const shots = useMemo(() => {
    let cursor = 0;
    return (shotState.data?.items ?? []).map((row) => {
      const shot = toShot(row, cursor);
      cursor += shot.durationSec;
      return shot;
    });
  }, [shotState.data]);

  const audioTracks = useMemo<AudioTrack[]>(
    () =>
      (audioState.data?.items ?? []).map((row) => ({
        id: row.id,
        label: row.name,
        durationSec: row.duration === null ? 0 : Math.round(row.duration / 1000),
        // Nothing stores an amplitude series, and the previous page generated
        // one with a random walk. An empty waveform draws nothing, which is
        // accurate; a generated one is a picture of noise presented as audio.
        waveform: [],
      })),
    [audioState.data],
  );

  // Live presence comes from the realtime service, which this page does not
  // connect to. Three named collaborators used to be listed as present on every
  // project timeline whether anyone was there or not.
  const collaborators: Collaborator[] = [];

  if (shotState.loading || audioState.loading) {
    return (
      <div className="h-screen w-screen bg-zinc-950 p-6">
        <LoadingState label="Loading timeline" />
      </div>
    );
  }

  if (shotState.error || audioState.error) {
    return (
      <div className="h-screen w-screen bg-zinc-950 p-6">
        <ErrorState
          error={shotState.error ?? audioState.error!}
          onRetry={() => {
            shotState.reload();
            audioState.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-zinc-950">
      <TimelineRoot shots={shots} audioTracks={audioTracks} collaborators={collaborators} />
    </div>
  );
}
