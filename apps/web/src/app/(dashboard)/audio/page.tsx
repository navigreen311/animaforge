'use client';

import { useState } from 'react';
import { Music, Play, Mic, Volume2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type AudioTab = 'music' | 'voice' | 'sfx';

interface Track {
  id: string;
  name: string;
  genre: string;
  mood: string;
  duration: string;
  bpm: number;
  gradient: string;
}

// ── Sample Data ──────────────────────────────────────────────
const TABS: { label: string; value: AudioTab; icon: React.ReactNode }[] = [
  { label: 'Music', value: 'music', icon: <Music size={13} /> },
  { label: 'Voice', value: 'voice', icon: <Mic size={13} /> },
  { label: 'Sound Effects', value: 'sfx', icon: <Volume2 size={13} /> },
];

const GENRES = ['Cinematic', 'Electronic', 'Ambient', 'Jazz'] as const;
const MOODS = ['Tense', 'Peaceful', 'Epic', 'Mysterious'] as const;

const TRACKS: Track[] = [
  {
    id: 'track-1',
    name: 'Neon Streets',
    genre: 'Electronic',
    mood: 'Tense',
    duration: '0:32',
    bpm: 128,
    gradient: 'linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)',
  },
  {
    id: 'track-2',
    name: 'Garden Lullaby',
    genre: 'Ambient',
    mood: 'Peaceful',
    duration: '1:05',
    bpm: 72,
    gradient: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
  },
  {
    id: 'track-3',
    name: 'Final Battle',
    genre: 'Cinematic',
    mood: 'Epic',
    duration: '0:48',
    bpm: 140,
    gradient: 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)',
  },
];

const SFX_CHIPS = ['Explosion', 'Footsteps', 'Rain', 'Sword Clash'] as const;

// ── Component ────────────────────────────────────────────────
export default function AudioStudioPage() {
  const [activeTab, setActiveTab] = useState<AudioTab>('music');
  const [selectedGenre, setSelectedGenre] = useState<string>('Cinematic');
  const [selectedMood, setSelectedMood] = useState<string>('Tense');
  const [duration, setDuration] = useState('0:30');
  const [bpm, setBpm] = useState('120');
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Audio Studio
            </h1>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.12)',
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              NEW
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
            }}
          >
            AI-powered music, voice, and sound effects
          </p>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              style={{
                background:
                  activeTab === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color:
                  activeTab === tab.value
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                border:
                  activeTab === tab.value
                    ? '0.5px solid var(--border)'
                    : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeTab === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Music Tab Content ────────────────────────────── */}
        {activeTab === 'music' && (
          <>
            {/* Generate Music Section */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Generate Music
              </h2>

              {/* Selectors Row */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {/* Genre Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Genre
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mood Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      fontSize: 12,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* BPM Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    BPM
                  </label>
                  <input
                    type="text"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      fontSize: 12,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                style={{
                  background: 'var(--brand)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                }}
              >
                <Music size={13} />
                Generate
              </button>
            </div>

            {/* Generated Tracks Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Generated Tracks
              </h2>

              {TRACKS.map((track) => (
                <div
                  key={track.id}
                  onMouseEnter={() => setHoveredTrack(track.id)}
                  onMouseLeave={() => setHoveredTrack(null)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border:
                      hoveredTrack === track.id
                        ? '0.5px solid var(--border-brand)'
                        : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  {/* Play Button */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Play size={14} style={{ color: '#ffffff', marginLeft: 1 }} />
                  </div>

                  {/* Track Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {track.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {track.genre} / {track.mood} &middot; BPM {track.bpm}
                    </span>
                  </div>

                  {/* Waveform Placeholder */}
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: track.gradient,
                      opacity: 0.5,
                      minWidth: 60,
                    }}
                  />

                  {/* Duration */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-tertiary)',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {track.duration}
                  </span>
                </div>
              ))}
            </div>

            {/* Sound Effects Library */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Sound Effects Library
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SFX_CHIPS.map((sfx) => (
                  <button
                    key={sfx}
                    type="button"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '0.5px solid var(--border)',
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--border-brand)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--border)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--text-secondary)';
                    }}
                  >
                    <Volume2 size={11} />
                    {sfx}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Voice Tab Content (placeholder) ─────────────── */}
        {activeTab === 'voice' && (
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Mic size={28} style={{ color: 'var(--text-tertiary)' }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Voice generation coming soon
            </span>
          </div>
        )}

        {/* ── Sound Effects Tab Content (placeholder) ──────── */}
        {activeTab === 'sfx' && (
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Volume2 size={28} style={{ color: 'var(--text-tertiary)' }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Sound effects studio coming soon
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
