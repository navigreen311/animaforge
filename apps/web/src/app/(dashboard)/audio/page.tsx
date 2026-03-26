'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Music,
  Play,
  Pause,
  Mic,
  Volume2,
  Download,
  MoreHorizontal,
  Search,
  ChevronDown,
  Plus,
  Layers,
  Star,
  Copy,
  Trash2,
  FileText,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────
type AudioTab = 'music' | 'voice' | 'sfx';
type MusicMode = 'free' | 'scene';

interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  mood: string;
  duration: string;
  bpm: number;
  bars: number[];
}

interface VoiceEntry {
  id: string;
  name: string;
  character: string;
  style: string;
  duration: string;
  bars: number[];
}

interface SfxItem {
  id: string;
  name: string;
  category: string;
  duration: string;
  icon: string;
}

// ── Constants ────────────────────────────────────────────────
const TABS: { label: string; value: AudioTab; icon: React.ReactNode }[] = [
  { label: 'Music', value: 'music', icon: <Music size={13} /> },
  { label: 'Voice', value: 'voice', icon: <Mic size={13} /> },
  { label: 'Sound Effects', value: 'sfx', icon: <Volume2 size={13} /> },
];

const GENRES = ['Cinematic', 'Electronic', 'Ambient', 'Jazz', 'Rock', 'Classical'] as const;
const MOODS = ['Tense', 'Peaceful', 'Epic', 'Mysterious', 'Romantic', 'Energetic'] as const;

const CHARACTERS = [
  { id: 'char-1', name: 'Elena (Female, Mid)' },
  { id: 'char-2', name: 'Marcus (Male, Deep)' },
  { id: 'char-3', name: 'Kai (Non-binary, Soft)' },
  { id: 'char-4', name: 'Amara (Female, Young)' },
  { id: 'char-5', name: 'Viktor (Male, Gruff)' },
] as const;

const SPEAKING_STYLES = ['Neutral', 'Dramatic', 'Whisper', 'Excited', 'Sad', 'Angry'] as const;

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean',
  'Mandarin', 'Portuguese', 'Italian', 'Arabic', 'Hindi', 'Russian',
] as const;

const SFX_CATEGORIES = ['All', 'Action', 'Nature', 'UI', 'Sci-Fi', 'Foley', 'Music Hits'] as const;

const SFX_DURATIONS = ['0.5s', '1s', '2s', '5s', 'Custom'] as const;

const PROJECTS = [
  { id: 'proj-1', name: 'Cyberpunk Short Film' },
  { id: 'proj-2', name: 'Nature Documentary' },
  { id: 'proj-3', name: 'Product Launch Ad' },
] as const;

const SCENE_SHOTS = [
  { id: 's1', label: 'Shot 1', color: '#6366f1', width: '18%' },
  { id: 's2', label: 'Shot 2', color: '#8b5cf6', width: '25%' },
  { id: 's3', label: 'Shot 3', color: '#ec4899', width: '12%' },
  { id: 's4', label: 'Shot 4', color: '#f59e0b', width: '22%' },
  { id: 's5', label: 'Shot 5', color: '#10b981', width: '23%' },
] as const;

// ── Helpers ──────────────────────────────────────────────────
function generateBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    bars.push(Math.floor(Math.random() * 28) + 4);
  }
  return bars;
}

// ── Mock Data ────────────────────────────────────────────────
const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'mt-1', name: 'Neon Streets', genre: 'Electronic', mood: 'Tense', duration: '0:32', bpm: 128, bars: generateBars(60) },
  { id: 'mt-2', name: 'Garden Lullaby', genre: 'Ambient', mood: 'Peaceful', duration: '1:05', bpm: 72, bars: generateBars(60) },
  { id: 'mt-3', name: 'Final Battle', genre: 'Cinematic', mood: 'Epic', duration: '0:48', bpm: 140, bars: generateBars(60) },
];

const VOICE_ENTRIES: VoiceEntry[] = [
  { id: 've-1', name: 'Hero Monologue — Take 1', character: 'Marcus', style: 'Dramatic', duration: '0:12', bars: generateBars(60) },
  { id: 've-2', name: 'Narrator Intro', character: 'Elena', style: 'Neutral', duration: '0:08', bars: generateBars(60) },
];

const SFX_LIBRARY: SfxItem[] = [
  { id: 'sfx-1', name: 'Laser Blast', category: 'Sci-Fi', duration: '0.5s', icon: '💥' },
  { id: 'sfx-2', name: 'Thunder Roll', category: 'Nature', duration: '2s', icon: '⛈' },
  { id: 'sfx-3', name: 'Sword Clash', category: 'Action', duration: '1s', icon: '⚔' },
  { id: 'sfx-4', name: 'Button Click', category: 'UI', duration: '0.5s', icon: '🔘' },
  { id: 'sfx-5', name: 'Footsteps Gravel', category: 'Foley', duration: '2s', icon: '👣' },
  { id: 'sfx-6', name: 'Explosion Large', category: 'Action', duration: '2s', icon: '💣' },
  { id: 'sfx-7', name: 'Bird Song', category: 'Nature', duration: '5s', icon: '🐦' },
  { id: 'sfx-8', name: 'Warp Drive', category: 'Sci-Fi', duration: '1s', icon: '🚀' },
  { id: 'sfx-9', name: 'Glass Shatter', category: 'Foley', duration: '1s', icon: '🪟' },
  { id: 'sfx-10', name: 'Orchestral Hit', category: 'Music Hits', duration: '0.5s', icon: '🎵' },
  { id: 'sfx-11', name: 'Rain Ambience', category: 'Nature', duration: '5s', icon: '🌧' },
  { id: 'sfx-12', name: 'Notification', category: 'UI', duration: '0.5s', icon: '🔔' },
];

// ── Shared Styles ────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: 24,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-secondary)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
};

const primaryBtnStyle: React.CSSProperties = {
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
};

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap',
};

// ── Waveform Component ───────────────────────────────────────
function Waveform({ bars, playing }: { bars: number[]; playing: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flex: 1,
        minWidth: 80,
        height: 32,
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 2,
            height: h,
            borderRadius: 1,
            background: playing ? 'var(--brand)' : 'var(--text-tertiary)',
            opacity: playing ? 0.9 : 0.35,
            transition: 'opacity 200ms ease',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Dropdown Menu Component ──────────────────────────────────
function DropdownMenu({
  trigger,
  items,
  open,
  onToggle,
}: {
  trigger: React.ReactNode;
  items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={onToggle} style={smallBtnStyle}>
        {trigger}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            minWidth: 160,
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                onToggle();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 4,
                fontSize: 12,
                color: item.danger ? '#ef4444' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)';
                if (!item.danger) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = item.danger ? '#ef4444' : 'var(--text-secondary)';
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
export default function AudioStudioPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<AudioTab>('music');

  // Music tab state
  const [musicMode, setMusicMode] = useState<MusicMode>('free');
  const [selectedGenre, setSelectedGenre] = useState('Cinematic');
  const [selectedMood, setSelectedMood] = useState('Tense');
  const [duration, setDuration] = useState('0:30');
  const [bpm, setBpm] = useState('120');
  const [bpmRangeOn, setBpmRangeOn] = useState(false);
  const [bpmMin, setBpmMin] = useState('100');
  const [bpmMax, setBpmMax] = useState('140');
  const [selectedProject, setSelectedProject] = useState(PROJECTS[0].id);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string | null>(null);
  const [trackNames, setTrackNames] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    MUSIC_TRACKS.forEach((t) => (m[t.id] = t.name));
    VOICE_ENTRIES.forEach((v) => (m[v.id] = v.name));
    return m;
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  // Voice tab state
  const [voiceCharacter, setVoiceCharacter] = useState(CHARACTERS[0].id);
  const [voiceText, setVoiceText] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<string>('Neutral');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(0);
  const [voiceLang, setVoiceLang] = useState('English');

  // SFX tab state
  const [sfxDescription, setSfxDescription] = useState('');
  const [sfxDuration, setSfxDuration] = useState('1s');
  const [sfxCustomDuration, setSfxCustomDuration] = useState('3.0');
  const [sfxCategory, setSfxCategory] = useState('All');
  const [sfxSearch, setSfxSearch] = useState('');

  // Handlers
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const times = tapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      tapTimesRef.current = [];
    }
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculated = Math.round(60000 / avg);
      setTapBpm(calculated);
      setBpm(String(calculated));
    }
  }, []);

  const togglePlay = (id: string) => {
    setPlayingTrack((prev) => (prev === id ? null : id));
  };

  const handleTrackNameSave = (id: string, value: string) => {
    setTrackNames((prev) => ({ ...prev, [id]: value || prev[id] }));
    setEditingTrackName(null);
  };

  const filteredSfx = SFX_LIBRARY.filter((s) => {
    const matchCat = sfxCategory === 'All' || s.category === sfxCategory;
    const matchSearch = !sfxSearch || s.name.toLowerCase().includes(sfxSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Close dropdowns on outside click
  const handlePageClick = () => {
    if (openDropdown) setOpenDropdown(null);
  };

  // ── Render Helpers ─────────────────────────────────────────

  const renderPlayButton = (id: string) => {
    const isPlaying = playingTrack === id;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay(id);
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {isPlaying ? (
          <Pause size={14} style={{ color: '#ffffff' }} />
        ) : (
          <Play size={14} style={{ color: '#ffffff', marginLeft: 1 }} />
        )}
      </button>
    );
  };

  const renderTrackActions = (id: string) => {
    const stemsItems = [
      { label: 'All Stems (ZIP)', icon: <Download size={12} />, onClick: () => toast.success('Downloading all stems...') },
      { label: 'Drums', icon: <Layers size={12} />, onClick: () => toast.success('Downloading drums stem...') },
      { label: 'Bass', icon: <Layers size={12} />, onClick: () => toast.success('Downloading bass stem...') },
      { label: 'Melody', icon: <Layers size={12} />, onClick: () => toast.success('Downloading melody stem...') },
      { label: 'Harmony', icon: <Layers size={12} />, onClick: () => toast.success('Downloading harmony stem...') },
    ];

    const moreItems = [
      { label: 'Rename', icon: <Edit3 size={12} />, onClick: () => setEditingTrackName(id) },
      { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => toast.success('Track duplicated') },
      { label: 'Favorites', icon: <Star size={12} />, onClick: () => toast.success('Added to favorites') },
      { label: 'Cue Sheet', icon: <FileText size={12} />, onClick: () => toast.success('Cue sheet exported') },
      { label: 'Delete', icon: <Trash2 size={12} />, onClick: () => toast('Track deleted'), danger: true },
    ];

    return (
      <div
        style={{
          display: 'flex',
          gap: 4,
          opacity: hoveredTrack === id ? 1 : 0,
          transition: 'opacity 150ms ease',
          pointerEvents: hoveredTrack === id ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          style={smallBtnStyle}
          onClick={(e) => { e.stopPropagation(); toast.success('Add to Project menu'); }}
        >
          Add to Project <ChevronDown size={10} />
        </button>
        <button
          type="button"
          style={smallBtnStyle}
          onClick={(e) => { e.stopPropagation(); toast.success('Downloading...'); }}
        >
          <Download size={11} /> Download <ChevronDown size={10} />
        </button>
        <DropdownMenu
          trigger={<><Layers size={11} /> Stems <ChevronDown size={10} /></>}
          items={stemsItems}
          open={openDropdown === `stems-${id}`}
          onToggle={() => setOpenDropdown(openDropdown === `stems-${id}` ? null : `stems-${id}`)}
        />
        <DropdownMenu
          trigger={<MoreHorizontal size={13} />}
          items={moreItems}
          open={openDropdown === `more-${id}`}
          onToggle={() => setOpenDropdown(openDropdown === `more-${id}` ? null : `more-${id}`)}
        />
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }} onClick={handlePageClick}>
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

        {/* ━━━━━━━━━━━━ MUSIC TAB ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'music' && (
          <>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: 0 }}>
              {(['free', 'scene'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMusicMode(mode)}
                  style={{
                    background: musicMode === mode ? 'var(--brand)' : 'var(--bg-elevated)',
                    color: musicMode === mode ? '#ffffff' : 'var(--text-secondary)',
                    border: musicMode === mode
                      ? '0.5px solid var(--brand)'
                      : '0.5px solid var(--border)',
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: mode === 'free' ? 'var(--radius-md) 0 0 var(--radius-md)' : '0 var(--radius-md) var(--radius-md) 0',
                    transition: 'all 150ms ease',
                  }}
                >
                  {mode === 'free' ? 'Free generation' : 'Score from scene'}
                </button>
              ))}
            </div>

            {/* Free Generation Form */}
            {musicMode === 'free' && (
              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Generate Music</h2>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {/* Genre */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                    <label style={labelStyle}>Genre</label>
                    <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} style={selectStyle}>
                      {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Mood */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                    <label style={labelStyle}>Mood</label>
                    <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} style={selectStyle}>
                      {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                    <label style={labelStyle}>Duration</label>
                    <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} placeholder="0:30" />
                  </div>

                  {/* BPM */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: bpmRangeOn ? 180 : 80 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={labelStyle}>BPM</label>
                      <button
                        type="button"
                        onClick={() => setBpmRangeOn(!bpmRangeOn)}
                        style={{
                          background: bpmRangeOn ? 'var(--brand-dim)' : 'transparent',
                          color: bpmRangeOn ? 'var(--brand-light)' : 'var(--text-tertiary)',
                          border: '0.5px solid var(--border)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          fontSize: 9,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Range
                      </button>
                    </div>
                    {bpmRangeOn ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="text" value={bpmMin} onChange={(e) => setBpmMin(e.target.value)} style={{ ...inputStyle, width: 60 }} placeholder="Min" />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>-</span>
                        <input type="text" value={bpmMax} onChange={(e) => setBpmMax(e.target.value)} style={{ ...inputStyle, width: 60 }} placeholder="Max" />
                      </div>
                    ) : (
                      <input type="text" value={bpm} onChange={(e) => setBpm(e.target.value)} style={inputStyle} placeholder="120" />
                    )}
                  </div>

                  {/* Tap Tempo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                    <label style={labelStyle}>Tap Tempo</label>
                    <button
                      type="button"
                      onClick={handleTapTempo}
                      style={{
                        ...inputStyle,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 500,
                        color: tapBpm ? 'var(--brand-light)' : 'var(--text-secondary)',
                        userSelect: 'none',
                      }}
                    >
                      {tapBpm ? `Tap: ${tapBpm} BPM` : 'Tap here'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  style={primaryBtnStyle}
                  onClick={() => toast.success('Generating music...')}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Music size={13} />
                  Generate Music
                </button>
              </div>
            )}

            {/* Score from Scene Mode */}
            {musicMode === 'scene' && (
              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Score from Scene</h2>

                {/* Project Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
                  <label style={labelStyle}>Project</label>
                  <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={selectStyle}>
                    {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Simplified Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Scene Timeline</label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 2,
                      height: 36,
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '0.5px solid var(--border)',
                    }}
                  >
                    {SCENE_SHOTS.map((shot) => (
                      <div
                        key={shot.id}
                        style={{
                          width: shot.width,
                          background: shot.color,
                          opacity: 0.75,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 600,
                          color: '#ffffff',
                          borderRadius: 2,
                        }}
                      >
                        {shot.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-detected Params */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Duration', value: '2:34' },
                    { label: 'Mood', value: 'Tense → Epic' },
                    { label: 'Pacing', value: 'Medium → Fast' },
                  ].map((p) => (
                    <div key={p.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>{p.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{p.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  style={primaryBtnStyle}
                  onClick={() => toast.success('Generating scene score...')}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Music size={13} />
                  Generate Scene Score
                </button>
              </div>
            )}

            {/* Generated Tracks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={sectionTitleStyle}>Generated Tracks</h2>

              {MUSIC_TRACKS.map((track) => (
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
                    transition: 'border-color 150ms ease',
                  }}
                >
                  {renderPlayButton(track.id)}

                  {/* Track Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
                    {editingTrackName === track.id ? (
                      <input
                        autoFocus
                        defaultValue={trackNames[track.id] ?? track.name}
                        onBlur={(e) => handleTrackNameSave(track.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTrackNameSave(track.id, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingTrackName(null);
                        }}
                        style={{
                          ...inputStyle,
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '2px 6px',
                          width: 140,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => setEditingTrackName(track.id)}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'text',
                        }}
                      >
                        {trackNames[track.id] ?? track.name}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {track.genre} / {track.mood} &middot; BPM {track.bpm}
                    </span>
                  </div>

                  <Waveform bars={track.bars} playing={playingTrack === track.id} />

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

                  {renderTrackActions(track.id)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ━━━━━━━━━━━━ VOICE TAB ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'voice' && (
          <>
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Generate Voice</h2>

              {/* Character Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
                <label style={labelStyle}>Character Voice</label>
                <select value={voiceCharacter} onChange={(e) => setVoiceCharacter(e.target.value)} style={selectStyle}>
                  {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Text Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>Script Text</label>
                  <span
                    style={{
                      fontSize: 10,
                      color: voiceText.length > 500 ? '#ef4444' : 'var(--text-tertiary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {voiceText.length}/500
                  </span>
                </div>
                <textarea
                  value={voiceText}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setVoiceText(e.target.value);
                  }}
                  rows={4}
                  placeholder="Enter the dialogue or narration text..."
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Voice Controls — 3 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Speaking Style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Speaking Style</label>
                  <select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)} style={selectStyle}>
                    {SPEAKING_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Speed Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={labelStyle}>Speed</label>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.1}
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>0.7x</span>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>1.5x</span>
                  </div>
                </div>

                {/* Pitch Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={labelStyle}>Pitch</label>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{voicePitch > 0 ? '+' : ''}{voicePitch} st</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>-5 st</span>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>+5 st</span>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 200 }}>
                <label style={labelStyle}>Language</label>
                <select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)} style={selectStyle}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <button
                type="button"
                style={primaryBtnStyle}
                onClick={() => toast.success('Generating voice...')}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Mic size={13} />
                Generate Voice
              </button>
            </div>

            {/* Generated Voices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={sectionTitleStyle}>Generated Voices</h2>

              {VOICE_ENTRIES.map((voice) => (
                <div
                  key={voice.id}
                  onMouseEnter={() => setHoveredTrack(voice.id)}
                  onMouseLeave={() => setHoveredTrack(null)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border:
                      hoveredTrack === voice.id
                        ? '0.5px solid var(--border-brand)'
                        : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'border-color 150ms ease',
                  }}
                >
                  {renderPlayButton(voice.id)}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
                    {editingTrackName === voice.id ? (
                      <input
                        autoFocus
                        defaultValue={trackNames[voice.id] ?? voice.name}
                        onBlur={(e) => handleTrackNameSave(voice.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTrackNameSave(voice.id, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingTrackName(null);
                        }}
                        style={{
                          ...inputStyle,
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '2px 6px',
                          width: 180,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => setEditingTrackName(voice.id)}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'text',
                        }}
                      >
                        {trackNames[voice.id] ?? voice.name}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {voice.character} &middot; {voice.style}
                    </span>
                  </div>

                  <Waveform bars={voice.bars} playing={playingTrack === voice.id} />

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-tertiary)',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {voice.duration}
                  </span>

                  {renderTrackActions(voice.id)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ━━━━━━━━━━━━ SOUND EFFECTS TAB ━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'sfx' && (
          <>
            {/* Generate SFX Section */}
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Generate SFX</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={sfxDescription}
                  onChange={(e) => setSfxDescription(e.target.value)}
                  placeholder='e.g. "heavy rain on a tin roof", "sci-fi door whoosh", "crowd cheering"'
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Duration</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {SFX_DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSfxDuration(d)}
                        style={{
                          background: sfxDuration === d ? 'var(--brand)' : 'var(--bg-surface)',
                          color: sfxDuration === d ? '#ffffff' : 'var(--text-secondary)',
                          border: sfxDuration === d ? '0.5px solid var(--brand)' : '0.5px solid var(--border)',
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {sfxDuration === 'Custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 80 }}>
                    <label style={labelStyle}>Seconds</label>
                    <input
                      type="text"
                      value={sfxCustomDuration}
                      onChange={(e) => setSfxCustomDuration(e.target.value)}
                      style={inputStyle}
                      placeholder="3.0"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                style={primaryBtnStyle}
                onClick={() => toast.success('Generating SFX...')}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Volume2 size={13} />
                Generate SFX
              </button>
            </div>

            {/* SFX Library */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={sectionTitleStyle}>SFX Library</h2>

              {/* Search */}
              <div style={{ position: 'relative', maxWidth: 320 }}>
                <Search
                  size={13}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  value={sfxSearch}
                  onChange={(e) => setSfxSearch(e.target.value)}
                  placeholder="Search sound effects..."
                  style={{
                    ...inputStyle,
                    paddingLeft: 30,
                  }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SFX_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSfxCategory(cat)}
                    style={{
                      background: sfxCategory === cat ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                      color: sfxCategory === cat ? 'var(--brand-light)' : 'var(--text-secondary)',
                      border: sfxCategory === cat
                        ? '0.5px solid var(--brand-border)'
                        : '0.5px solid var(--border)',
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* SFX Grid — 4 per row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                }}
              >
                {filteredSfx.map((sfx) => (
                  <div
                    key={sfx.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'border-color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-brand)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{sfx.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
                    >
                      {sfx.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {sfx.duration}
                    </span>
                    <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => togglePlay(sfx.id)}
                        style={{
                          ...smallBtnStyle,
                          flex: 1,
                          justifyContent: 'center',
                          padding: '5px 0',
                        }}
                      >
                        {playingTrack === sfx.id ? <Pause size={11} /> : <Play size={11} />}
                        {playingTrack === sfx.id ? 'Stop' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success(`${sfx.name} added to project`)}
                        style={{
                          ...smallBtnStyle,
                          flex: 1,
                          justifyContent: 'center',
                          padding: '5px 0',
                          background: 'var(--brand-dim)',
                          color: 'var(--brand-light)',
                          borderColor: 'var(--brand-border)',
                        }}
                      >
                        <Plus size={11} />
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSfx.length === 0 && (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 12,
                  }}
                >
                  No sound effects found matching your search.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
