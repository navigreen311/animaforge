import { NextRequest, NextResponse } from 'next/server';

const MOCK_TRACKS = [
  {
    trackId: 'track_001',
    name: 'Cinematic Epic Track',
    audioUrl: '/mock-music.mp3',
    duration: 120,
    bpm: 90,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    type: 'music' as const,
    isFavorite: true,
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    trackId: 'track_002',
    name: 'Ambient Chill Track',
    audioUrl: '/mock-music.mp3',
    duration: 180,
    bpm: 70,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    type: 'music' as const,
    isFavorite: false,
    createdAt: '2026-03-21T14:30:00Z',
  },
  {
    trackId: 'track_003',
    name: 'Electronic Upbeat Track',
    audioUrl: '/mock-music.mp3',
    duration: 90,
    bpm: 128,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 80 + 20),
    type: 'music' as const,
    isFavorite: false,
    createdAt: '2026-03-22T09:15:00Z',
  },
  {
    trackId: 'track_004',
    name: 'Voice - Narrator',
    audioUrl: '/mock-voice.mp3',
    duration: 45,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 60 + 10),
    type: 'voice' as const,
    isFavorite: true,
    createdAt: '2026-03-23T11:00:00Z',
  },
  {
    trackId: 'track_005',
    name: 'Explosion Boom',
    audioUrl: '/mock-sfx.mp3',
    duration: 3,
    waveformData: Array(60)
      .fill(0)
      .map(() => Math.random() * 90 + 10),
    type: 'sfx' as const,
    isFavorite: false,
    createdAt: '2026-03-24T16:45:00Z',
  },
];

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    tracks: MOCK_TRACKS,
    total: MOCK_TRACKS.length,
  });
}
