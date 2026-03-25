'use client';

import { TimelineRoot } from '@/components/timeline';
import type { Shot, AudioTrack, Collaborator } from '@/components/timeline';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SHOTS: Shot[] = [
  {
    id: 'shot-1',
    number: 1,
    subject: 'Hero enters the forest',
    camera: 'Wide establishing',
    action: 'Walking slowly forward',
    emotion: 'Curious, cautious',
    timing: '0:00 - 0:04',
    dialogue: '',
    durationSec: 4,
    status: 'approved',
    characterRefs: ['Hero', 'Companion'],
    styleRef: 'Ghibli watercolor',
  },
  {
    id: 'shot-2',
    number: 2,
    subject: 'Close-up on hero face',
    camera: 'Medium close-up',
    action: 'Looks around, eyes widen',
    emotion: 'Wonder',
    timing: '0:04 - 0:07',
    dialogue: 'What is this place?',
    durationSec: 3,
    status: 'approved',
    characterRefs: ['Hero'],
    styleRef: 'Ghibli watercolor',
  },
  {
    id: 'shot-3',
    number: 3,
    subject: 'Pan across ancient ruins',
    camera: 'Slow pan right',
    action: 'Camera movement only',
    emotion: 'Mystical, awe',
    timing: '0:07 - 0:12',
    dialogue: '',
    durationSec: 5,
    status: 'generating',
    characterRefs: [],
    styleRef: 'Ghibli watercolor',
  },
  {
    id: 'shot-4',
    number: 4,
    subject: 'Companion discovers artifact',
    camera: 'Over-the-shoulder',
    action: 'Reaches out and picks up glowing orb',
    emotion: 'Excitement, fear',
    timing: '0:12 - 0:16',
    dialogue: 'Look at this!',
    durationSec: 4,
    status: 'pending',
    characterRefs: ['Companion'],
    styleRef: 'Ghibli watercolor',
  },
  {
    id: 'shot-5',
    number: 5,
    subject: 'Orb activates, light burst',
    camera: 'Low angle dramatic',
    action: 'Light expands outward, characters shield eyes',
    emotion: 'Shock, intensity',
    timing: '0:16 - 0:20',
    dialogue: '',
    durationSec: 4,
    status: 'draft',
    characterRefs: ['Hero', 'Companion'],
    styleRef: 'Ghibli watercolor',
  },
];

/** Generate a simple pseudo-random waveform array */
function mockWaveform(count: number): number[] {
  const waveform: number[] = [];
  let val = 0.3;
  for (let i = 0; i < count; i++) {
    val += (Math.sin(i * 0.7) * 0.15 + Math.cos(i * 0.3) * 0.1);
    waveform.push(Math.max(0.05, Math.min(1, Math.abs(val))));
  }
  return waveform;
}

const MOCK_AUDIO_TRACKS: AudioTrack[] = [
  {
    id: 'audio-1',
    label: 'Dialogue',
    durationSec: 20,
    waveform: mockWaveform(160),
  },
  {
    id: 'audio-2',
    label: 'Music',
    durationSec: 22,
    waveform: mockWaveform(176),
  },
];

const MOCK_COLLABORATORS: Collaborator[] = [
  { id: 'user-1', name: 'Alice (Director)', color: '#8b5cf6' },
  { id: 'user-2', name: 'Bob (Animator)', color: '#06b6d4' },
  { id: 'user-3', name: 'Carol (Sound)', color: '#f59e0b' },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TimelinePage() {
  return (
    <div className="h-screen w-screen bg-zinc-950">
      <TimelineRoot
        shots={MOCK_SHOTS}
        audioTracks={MOCK_AUDIO_TRACKS}
        collaborators={MOCK_COLLABORATORS}
      />
    </div>
  );
}
