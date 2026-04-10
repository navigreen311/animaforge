'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Square,
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
  Loader2,
  Upload,
  X,
  FolderPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import WaveformVisualizer from '@/components/ui/WaveformVisualizer';
import { audioPlayer } from '@/lib/audioPlayer';

// Mock audio URL used for all preview playback in the UI.
const MOCK_AUDIO_URL =
  'https://cdn.jsdelivr.net/gh/anars/blank-audio@master/2-seconds-of-silence.mp3';

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

type ShotStatus = 'approved' | 'in-progress' | 'draft' | 'needs-review';

interface SceneShot {
  id: string;
  label: string;
  durationSec: number;
  status: ShotStatus;
  emotionalBeat: string;
}

interface BeatMarker {
  timecodeMs: number;
  type: 'hit' | 'beat' | 'downbeat';
}

interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'non-binary';
  pitch: 'low' | 'mid' | 'high';
}

// ── Constants ────────────────────────────────────────────────
const TABS: { label: string; value: AudioTab; icon: React.ReactNode }[] = [
  { label: 'Music', value: 'music', icon: <Music size={13} /> },
  { label: 'Voice', value: 'voice', icon: <Mic size={13} /> },
  { label: 'Sound Effects', value: 'sfx', icon: <Volume2 size={13} /> },
];

const GENRES = ['Cinematic', 'Electronic', 'Ambient', 'Jazz', 'Rock', 'Classical'] as const;
const MOODS = ['Tense', 'Peaceful', 'Epic', 'Mysterious', 'Romantic', 'Energetic'] as const;

const CHARACTER_VOICES: VoiceOption[] = [
  { id: 'voice-elena', name: 'Elena', gender: 'female', pitch: 'mid' },
  { id: 'voice-kenji', name: 'Kenji', gender: 'male', pitch: 'low' },
  { id: 'voice-aria', name: 'Aria', gender: 'female', pitch: 'high' },
  { id: 'voice-marcus', name: 'Marcus', gender: 'male', pitch: 'mid' },
];


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

const STATUS_COLORS: Record<ShotStatus, string> = {
  approved: '#10b981',
  'in-progress': '#f59e0b',
  draft: '#6b7280',
  'needs-review': '#ec4899',
};

const PROJECT_SHOTS: Record<string, SceneShot[]> = {
  'proj-1': [
    { id: 'p1-s1', label: 'Shot 1', durationSec: 3.2, status: 'approved', emotionalBeat: 'Tense' },
    { id: 'p1-s2', label: 'Shot 2', durationSec: 5.4, status: 'approved', emotionalBeat: 'Mysterious' },
    { id: 'p1-s3', label: 'Shot 3', durationSec: 2.1, status: 'in-progress', emotionalBeat: 'Tense' },
    { id: 'p1-s4', label: 'Shot 4', durationSec: 4.8, status: 'draft', emotionalBeat: 'Epic' },
    { id: 'p1-s5', label: 'Shot 5', durationSec: 2.6, status: 'needs-review', emotionalBeat: 'Epic' },
    { id: 'p1-s6', label: 'Shot 6', durationSec: 5.9, status: 'approved', emotionalBeat: 'Triumphant' },
    { id: 'p1-s7', label: 'Shot 7', durationSec: 3.5, status: 'in-progress', emotionalBeat: 'Triumphant' },
    { id: 'p1-s8', label: 'Shot 8', durationSec: 4.2, status: 'draft', emotionalBeat: 'Resolute' },
  ],
  'proj-2': [
    { id: 'p2-s1', label: 'Shot 1', durationSec: 5.8, status: 'approved', emotionalBeat: 'Peaceful' },
    { id: 'p2-s2', label: 'Shot 2', durationSec: 4.2, status: 'approved', emotionalBeat: 'Peaceful' },
    { id: 'p2-s3', label: 'Shot 3', durationSec: 3.1, status: 'in-progress', emotionalBeat: 'Curious' },
    { id: 'p2-s4', label: 'Shot 4', durationSec: 5.5, status: 'draft', emotionalBeat: 'Awe' },
    { id: 'p2-s5', label: 'Shot 5', durationSec: 2.4, status: 'approved', emotionalBeat: 'Awe' },
    { id: 'p2-s6', label: 'Shot 6', durationSec: 4.7, status: 'needs-review', emotionalBeat: 'Uplifting' },
    { id: 'p2-s7', label: 'Shot 7', durationSec: 3.8, status: 'in-progress', emotionalBeat: 'Uplifting' },
    { id: 'p2-s8', label: 'Shot 8', durationSec: 5.2, status: 'approved', emotionalBeat: 'Peaceful' },
  ],
  'proj-3': [
    { id: 'p3-s1', label: 'Shot 1', durationSec: 2.0, status: 'approved', emotionalBeat: 'Energetic' },
    { id: 'p3-s2', label: 'Shot 2', durationSec: 2.4, status: 'approved', emotionalBeat: 'Energetic' },
    { id: 'p3-s3', label: 'Shot 3', durationSec: 2.1, status: 'in-progress', emotionalBeat: 'Bold' },
    { id: 'p3-s4', label: 'Shot 4', durationSec: 2.8, status: 'draft', emotionalBeat: 'Bold' },
    { id: 'p3-s5', label: 'Shot 5', durationSec: 2.3, status: 'approved', emotionalBeat: 'Confident' },
    { id: 'p3-s6', label: 'Shot 6', durationSec: 2.6, status: 'needs-review', emotionalBeat: 'Confident' },
    { id: 'p3-s7', label: 'Shot 7', durationSec: 2.2, status: 'in-progress', emotionalBeat: 'Triumphant' },
    { id: 'p3-s8', label: 'Shot 8', durationSec: 2.5, status: 'approved', emotionalBeat: 'Triumphant' },
  ],
};

// Legacy flat list (used by SFX "add to timeline" modal)
const SCENE_SHOTS = PROJECT_SHOTS['proj-1'];

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function computePacing(shots: SceneShot[]): string {
  if (shots.length === 0) return '—';
  const avg = shots.reduce((a, b) => a + b.durationSec, 0) / shots.length;
  if (avg < 3) return 'Fast';
  if (avg < 6) return 'Medium';
  return 'Slow';
}

function generateMockBeatMap(totalDurationSec: number, bpm = 120): BeatMarker[] {
  const beatIntervalMs = 60000 / bpm;
  const totalMs = totalDurationSec * 1000;
  const markers: BeatMarker[] = [];
  let beatCount = 0;
  for (let t = 0; t <= totalMs; t += beatIntervalMs) {
    const type: BeatMarker['type'] = beatCount % 4 === 0 ? 'downbeat' : 'beat';
    markers.push({ timecodeMs: Math.round(t), type });
    beatCount++;
  }
  // Add some hits
  for (let i = 0; i < 5; i++) {
    markers.push({
      timecodeMs: Math.round(Math.random() * totalMs),
      type: 'hit',
    });
  }
  return markers.sort((a, b) => a.timecodeMs - b.timecodeMs);
}

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
  ariaLabel,
}: {
  trigger: React.ReactNode;
  items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[];
  open: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={onToggle} style={smallBtnStyle} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open}>
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
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string | null>(null);
  // SFX Add-to-project modal (AU-4)
  const [sfxAddModal, setSfxAddModal] = useState<{ sfx: SfxItem } | null>(null);
  const [sfxModalProject, setSfxModalProject] = useState<string>(PROJECTS[0].id);
  const [sfxModalShot, setSfxModalShot] = useState<string>('s1');
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
  const [voiceCharacter, setVoiceCharacter] = useState<string>('');
  const [voiceText, setVoiceText] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<string>('Neutral');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(0);
  const [voiceLang, setVoiceLang] = useState('English');
  const [voiceUploadModalOpen, setVoiceUploadModalOpen] = useState(false);
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [voiceGenProgress, setVoiceGenProgress] = useState(0);
  const [voiceGenEtaSec, setVoiceGenEtaSec] = useState(0);

  // Score from Scene state (AU-5 / AU-6)
  const [sceneShots, setSceneShots] = useState<SceneShot[]>(PROJECT_SHOTS[PROJECTS[0].id] ?? []);
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(new Set());
  const [sceneGenerating, setSceneGenerating] = useState(false);
  const [beatMap, setBeatMap] = useState<BeatMarker[] | null>(null);

  // Music gen loading state (AU-8)
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [pendingTrackIds, setPendingTrackIds] = useState<string[]>([]);
  const [extraTracks, setExtraTracks] = useState<MusicTrack[]>([]);

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

  const togglePlay = useCallback((id: string) => {
    // If this track is already playing, stop it.
    if (audioPlayer.isPlaying(id)) {
      audioPlayer.stop();
      setPlayingTrack(null);
      setPlaybackProgress(0);
      return;
    }

    // Otherwise start playback via the shared audioPlayer. We optimistically
    // flip UI state so the play button, waveform, and progress overlays all
    // react immediately even while the buffer is being fetched/decoded.
    setPlayingTrack(id);
    setPlaybackProgress(0);
    audioPlayer
      .play(
        id,
        MOCK_AUDIO_URL,
        (progress) => setPlaybackProgress(progress),
        () => {
          setPlayingTrack((curr) => (curr === id ? null : curr));
          setPlaybackProgress(0);
        }
      )
      .catch((err) => {
        console.error('[audio] play failed', err);
        toast.error('Playback failed');
        setPlayingTrack((curr) => (curr === id ? null : curr));
        setPlaybackProgress(0);
      });
  }, []);

  // Stop playback when the component unmounts.
  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, []);

  const handleTrackNameSave = (id: string, value: string) => {
    setTrackNames((prev) => ({ ...prev, [id]: value || prev[id] }));
    setEditingTrackName(null);
  };

  const filteredSfx = SFX_LIBRARY.filter((s) => {
    const matchCat = sfxCategory === 'All' || s.category === sfxCategory;
    const matchSearch = !sfxSearch || s.name.toLowerCase().includes(sfxSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // AU-5: reload shots when project changes
  useEffect(() => {
    setSceneShots(PROJECT_SHOTS[selectedProject] ?? []);
    setSelectedShotIds(new Set());
    setBeatMap(null);
  }, [selectedProject]);

  const selectedShots = sceneShots.filter((s) => selectedShotIds.has(s.id));
  const selectedTotalSec = selectedShots.reduce((a, b) => a + b.durationSec, 0);
  const selectedTotalDuration = selectedShots.length > 0 ? formatDuration(selectedTotalSec) : '\u2014';
  const selectedMoodArc =
    selectedShots.length === 0
      ? '\u2014'
      : selectedShots.length === 1
      ? selectedShots[0].emotionalBeat
      : `${selectedShots[0].emotionalBeat} \u2192 ${selectedShots[selectedShots.length - 1].emotionalBeat}`;
  const selectedPacing = computePacing(selectedShots);

  const toggleShotSelection = (id: string) => {
    setSelectedShotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateSceneScore = () => {
    if (sceneGenerating) return;
    setSceneGenerating(true);
    setBeatMap(null);
    toast.success('Generating scene score...');
    const durationForBeats = selectedTotalSec > 0 ? selectedTotalSec : 32;
    setTimeout(() => {
      setBeatMap(generateMockBeatMap(durationForBeats, 120));
      setSceneGenerating(false);
      toast.success('Scene score generated');
    }, 2000);
  };

  const voiceCanGenerate = voiceCharacter !== '' && voiceText.trim().length > 0 && !voiceGenerating;
  const handleGenerateVoice = () => {
    if (!voiceCanGenerate) return;
    setVoiceGenerating(true);
    setVoiceGenProgress(0);
    const totalSec = 8;
    setVoiceGenEtaSec(totalSec);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const pct = Math.min(100, (elapsed / totalSec) * 100);
      setVoiceGenProgress(pct);
      setVoiceGenEtaSec(Math.max(0, Math.ceil(totalSec - elapsed)));
      if (pct >= 100) {
        clearInterval(interval);
        setVoiceGenerating(false);
        toast.success('Voice generated');
      }
    }, 150);
  };

  const handleGenerateMusic = () => {
    if (musicGenerating) return;
    setMusicGenerating(true);
    const pendingId = `pending-${Date.now()}`;
    setPendingTrackIds((prev) => [...prev, pendingId]);
    toast.success('Generating music... (~20s)');
    setTimeout(() => {
      const newTrack: MusicTrack = {
        id: `mt-${Date.now()}`,
        name: `${selectedGenre} ${selectedMood} Track`,
        genre: selectedGenre,
        mood: selectedMood,
        duration: duration || '0:30',
        bpm: parseInt(bpm) || 120,
        bars: generateBars(60),
      };
      setExtraTracks((prev) => [newTrack, ...prev]);
      setPendingTrackIds((prev) => prev.filter((id) => id !== pendingId));
      setMusicGenerating(false);
      setTrackNames((prev) => ({ ...prev, [newTrack.id]: newTrack.name }));
      toast.success('Music track ready');
    }, 3000);
  };

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
        aria-label={isPlaying ? 'Pause' : 'Play'}
        aria-pressed={isPlaying}
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

  const renderTrackActions = (id: string, isMusic: boolean) => {
    const displayName = trackNames[id] ?? id;

    const timelineItems = PROJECTS.map((p) => ({
      label: p.name,
      icon: <FolderPlus size={12} />,
      onClick: () => toast.success(`"${displayName}" added to ${p.name} timeline`),
    }));

    const downloadItems = [
      { label: 'MP3', icon: <Download size={12} />, onClick: () => toast.success(`Downloading ${displayName}.mp3`) },
      { label: 'WAV', icon: <Download size={12} />, onClick: () => toast.success(`Downloading ${displayName}.wav`) },
      { label: 'AIFF', icon: <Download size={12} />, onClick: () => toast.success(`Downloading ${displayName}.aiff`) },
    ];

    const stemsItems = [
      { label: 'All stems (ZIP)', icon: <Download size={12} />, onClick: () => toast.success('Downloading all stems...') },
      { label: 'Drums', icon: <Layers size={12} />, onClick: () => toast.success('Downloading drums stem...') },
      { label: 'Bass', icon: <Layers size={12} />, onClick: () => toast.success('Downloading bass stem...') },
      { label: 'Melody', icon: <Layers size={12} />, onClick: () => toast.success('Downloading melody stem...') },
    ];

    const moreItems = [
      { label: 'Rename', icon: <Edit3 size={12} />, onClick: () => setEditingTrackName(id) },
      { label: 'Add to favorites', icon: <Star size={12} />, onClick: () => toast.success('Added to favorites') },
      { label: 'Generate cue sheet', icon: <FileText size={12} />, onClick: () => toast.success('Cue sheet generated') },
      { label: 'Delete', icon: <Trash2 size={12} />, onClick: () => toast('Track deleted'), danger: true },
    ];

    const visible = hoveredTrack === id || openDropdown?.endsWith(`-${id}`);

    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ display: 'flex', gap: 4 }}
          >
            <DropdownMenu
              trigger={<>Add to Timeline <ChevronDown size={10} /></>}
              items={timelineItems}
              open={openDropdown === `timeline-${id}`}
              onToggle={() => setOpenDropdown(openDropdown === `timeline-${id}` ? null : `timeline-${id}`)}
            />
            <DropdownMenu
              trigger={<><Download size={11} /> Download <ChevronDown size={10} /></>}
              items={downloadItems}
              open={openDropdown === `download-${id}`}
              onToggle={() => setOpenDropdown(openDropdown === `download-${id}` ? null : `download-${id}`)}
            />
            {isMusic && (
              <DropdownMenu
                trigger={<><Layers size={11} /> Stems <ChevronDown size={10} /></>}
                items={stemsItems}
                open={openDropdown === `stems-${id}`}
                onToggle={() => setOpenDropdown(openDropdown === `stems-${id}` ? null : `stems-${id}`)}
              />
            )}
            <DropdownMenu
              trigger={<MoreHorizontal size={13} />}
              ariaLabel="More options"
              items={moreItems}
              open={openDropdown === `more-${id}`}
              onToggle={() => setOpenDropdown(openDropdown === `more-${id}` ? null : `more-${id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
                    <label style={labelStyle} htmlFor="audio-duration">Duration</label>
                    <input id="audio-duration" type="text" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} placeholder="0:30" />
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
                        <input aria-label="Minimum BPM" type="text" value={bpmMin} onChange={(e) => setBpmMin(e.target.value)} style={{ ...inputStyle, width: 60 }} placeholder="Min" />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>-</span>
                        <input aria-label="Maximum BPM" type="text" value={bpmMax} onChange={(e) => setBpmMax(e.target.value)} style={{ ...inputStyle, width: 60 }} placeholder="Max" />
                      </div>
                    ) : (
                      <input aria-label="BPM" type="text" value={bpm} onChange={(e) => setBpm(e.target.value)} style={inputStyle} placeholder="120" />
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
                  disabled={musicGenerating}
                  style={{
                    ...primaryBtnStyle,
                    opacity: musicGenerating ? 0.7 : 1,
                    cursor: musicGenerating ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleGenerateMusic}
                  onMouseEnter={(e) => { if (!musicGenerating) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { if (!musicGenerating) e.currentTarget.style.opacity = '1'; }}
                >
                  {musicGenerating ? (
                    <>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating... (~20s)
                    </>
                  ) : (
                    <>
                      <Music size={13} />
                      Generate Music
                    </>
                  )}
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

                {/* Scene Timeline with real shots (AU-5) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>Scene Timeline</label>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {selectedShotIds.size > 0
                        ? `${selectedShotIds.size} shot${selectedShotIds.size === 1 ? '' : 's'} selected`
                        : 'Click shots to select'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 2,
                      height: 44,
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '0.5px solid var(--border)',
                      padding: 2,
                    }}
                  >
                    {sceneShots.map((shot) => {
                      const totalAllSec = sceneShots.reduce((a, b) => a + b.durationSec, 0);
                      const widthPct = (shot.durationSec / totalAllSec) * 100;
                      const isSelected = selectedShotIds.has(shot.id);
                      return (
                        <button
                          key={shot.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleShotSelection(shot.id);
                          }}
                          title={`${shot.label} — ${shot.durationSec.toFixed(1)}s — ${shot.status} — ${shot.emotionalBeat}`}
                          style={{
                            width: `${widthPct}%`,
                            background: STATUS_COLORS[shot.status],
                            opacity: isSelected ? 1 : 0.65,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: 600,
                            color: '#ffffff',
                            borderRadius: 2,
                            border: isSelected ? '1.5px solid var(--brand)' : '1.5px solid transparent',
                            cursor: 'pointer',
                            transition: 'opacity 150ms ease, border-color 150ms ease',
                            padding: 0,
                          }}
                        >
                          {shot.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Status legend */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    {(Object.keys(STATUS_COLORS) as ShotStatus[]).map((st) => (
                      <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: STATUS_COLORS[st],
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Derived metadata (updates live from selection) */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Duration', value: selectedTotalDuration },
                    { label: 'Mood', value: selectedMoodArc },
                    { label: 'Pacing', value: selectedPacing },
                  ].map((p) => (
                    <div key={p.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>{p.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{p.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={sceneGenerating}
                  style={{
                    ...primaryBtnStyle,
                    opacity: sceneGenerating ? 0.7 : 1,
                    cursor: sceneGenerating ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleGenerateSceneScore}
                  onMouseEnter={(e) => { if (!sceneGenerating) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { if (!sceneGenerating) e.currentTarget.style.opacity = '1'; }}
                >
                  {sceneGenerating ? (
                    <>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Music size={13} />
                      Generate Scene Score
                    </>
                  )}
                </button>

                {/* AU-6: Beat map visualization overlaid on waveform */}
                {beatMap && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <label style={labelStyle}>Beat Map</label>
                    <div
                      style={{
                        position: 'relative',
                        height: 48,
                        background: 'var(--bg-surface)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Mock waveform */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          padding: '0 6px',
                        }}
                      >
                        {generateBars(80).map((h, i) => (
                          <div
                            key={i}
                            style={{
                              width: 2,
                              height: h,
                              background: 'var(--text-tertiary)',
                              opacity: 0.3,
                              borderRadius: 1,
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                      {/* Beat ticks */}
                      {(() => {
                        const totalMs = Math.max(...beatMap.map((m) => m.timecodeMs), 1);
                        return beatMap.map((m, i) => {
                          const leftPct = (m.timecodeMs / totalMs) * 100;
                          const isDownbeat = m.type === 'downbeat';
                          const isHit = m.type === 'hit';
                          return (
                            <div
                              key={i}
                              style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${leftPct}%`,
                                width: isDownbeat ? 2 : 1,
                                background: isHit
                                  ? 'var(--brand)'
                                  : isDownbeat
                                  ? '#ffffff'
                                  : 'rgba(255,255,255,0.2)',
                                pointerEvents: 'none',
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                    <button
                      type="button"
                      style={{ ...smallBtnStyle, alignSelf: 'flex-start' }}
                      onClick={() => toast.success('Beats aligned to cuts')}
                    >
                      Align beats to cuts
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generated Tracks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={sectionTitleStyle}>Generated Tracks</h2>

              {/* AU-8: Skeleton rows for pending generations */}
              {pendingTrackIds.map((pid) => (
                <div
                  key={pid}
                  className="animate-pulse"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader2 size={14} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
                    <div style={{ width: 140, height: 12, background: 'var(--bg-surface)', borderRadius: 4 }} />
                    <div style={{ width: 100, height: 10, background: 'var(--bg-surface)', borderRadius: 4 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 80, height: 14, background: 'var(--bg-surface)', borderRadius: 4 }} />
                  <div style={{ width: 32, height: 10, background: 'var(--bg-surface)', borderRadius: 4 }} />
                </div>
              ))}

              {[...extraTracks, ...MUSIC_TRACKS].map((track) => (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrackName(track.id);
                        }}
                        title="Click to rename"
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

                  <div style={{ flex: 1, minWidth: 80 }}>
                    <WaveformVisualizer
                      trackId={track.id}
                      isPlaying={playingTrack === track.id}
                      progress={playingTrack === track.id ? playbackProgress : 0}
                      color="var(--brand)"
                      staticData={track.bars.map((b) => b / 32)}
                      height={32}
                    />
                  </div>

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

                  {renderTrackActions(track.id, true)}
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

              {/* Character Selector (AU-7) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
                <label style={labelStyle}>Character Voice</label>
                <select
                  value={voiceCharacter}
                  onChange={(e) => {
                    if (e.target.value === '__upload__') {
                      setVoiceUploadModalOpen(true);
                    } else {
                      setVoiceCharacter(e.target.value);
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="" disabled>Select a voice...</option>
                  {CHARACTER_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender}, {v.pitch} pitch)
                    </option>
                  ))}
                  <option value="__upload__">+ Upload voice sample</option>
                </select>
              </div>

              {/* Text Input (AU-7: char count warnings at 400 / 490) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>Script Text</label>
                  <span
                    style={{
                      fontSize: 10,
                      color:
                        voiceText.length > 490
                          ? '#ef4444'
                          : voiceText.length > 400
                          ? '#eab308'
                          : 'var(--text-tertiary)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: voiceText.length > 400 ? 600 : 400,
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
                  aria-label="Voice dialogue text"
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
                    aria-label="Voice speed"
                    aria-valuenow={voiceSpeed}
                    aria-valuemin={0.7}
                    aria-valuemax={1.5}
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
                    aria-label="Voice pitch (semitones)"
                    aria-valuenow={voicePitch}
                    aria-valuemin={-5}
                    aria-valuemax={5}
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
                disabled={!voiceCanGenerate}
                onClick={handleGenerateVoice}
                style={{
                  ...primaryBtnStyle,
                  opacity: !voiceCanGenerate ? 0.5 : 1,
                  cursor: !voiceCanGenerate ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (voiceCanGenerate) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { if (voiceCanGenerate) e.currentTarget.style.opacity = '1'; }}
              >
                {voiceGenerating ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating voice... ~{voiceGenEtaSec}s
                  </>
                ) : (
                  <>
                    <Mic size={13} />
                    Generate Voice
                  </>
                )}
              </button>

              {/* Voice generation progress bar */}
              {voiceGenerating && (
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    background: 'var(--bg-surface)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${voiceGenProgress}%`,
                      height: '100%',
                      background: 'var(--brand)',
                      transition: 'width 150ms linear',
                    }}
                  />
                </div>
              )}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrackName(voice.id);
                        }}
                        title="Click to rename"
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

                  <div style={{ flex: 1, minWidth: 80 }}>
                    <WaveformVisualizer
                      trackId={voice.id}
                      isPlaying={playingTrack === voice.id}
                      progress={playingTrack === voice.id ? playbackProgress : 0}
                      color="var(--brand)"
                      staticData={voice.bars.map((b) => b / 32)}
                      height={32}
                    />
                  </div>

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

                  {renderTrackActions(voice.id, false)}
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
                <label style={labelStyle} htmlFor="sfx-description">Description</label>
                <input
                  id="sfx-description"
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
                    <label style={labelStyle} htmlFor="sfx-custom-duration">Seconds</label>
                    <input
                      id="sfx-custom-duration"
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
                  type="search"
                  aria-label="Search sound effects"
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
                {filteredSfx.map((sfx) => {
                  const isSfxPlaying = playingTrack === sfx.id;
                  return (
                    <div
                      key={sfx.id}
                      style={{
                        background: isSfxPlaying ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                        border: isSfxPlaying
                          ? '0.5px solid var(--brand-border, var(--brand))'
                          : '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'border-color 150ms ease, background 150ms ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSfxPlaying) {
                          e.currentTarget.style.borderColor = 'var(--border-brand)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSfxPlaying) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }
                      }}
                    >
                      {/* Playing progress bar overlay */}
                      {isSfxPlaying && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            bottom: 0,
                            height: 2,
                            width: `${Math.round(playbackProgress * 100)}%`,
                            background: 'var(--brand)',
                            transition: 'width 80ms linear',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay(sfx.id);
                          }}
                          style={{
                            ...smallBtnStyle,
                            flex: 1,
                            justifyContent: 'center',
                            padding: '5px 0',
                            background: isSfxPlaying ? 'var(--brand)' : 'var(--bg-surface)',
                            color: isSfxPlaying ? '#ffffff' : 'var(--text-secondary)',
                            borderColor: isSfxPlaying ? 'var(--brand)' : 'var(--border)',
                          }}
                        >
                          {isSfxPlaying ? <Square size={11} /> : <Play size={11} />}
                          {isSfxPlaying ? 'Stop' : 'Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSfxAddModal({ sfx });
                            setSfxModalProject(PROJECTS[0].id);
                            setSfxModalShot('s1');
                          }}
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
                  );
                })}
              </div>

              {filteredSfx.length === 0 && (
                <EmptyState
                  icon={Music}
                  title="No sound effects found"
                  description="Try adjusting your search query or browse a different category."
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* ── SFX Add-to-Project Modal (AU-4) ────────────────── */}
      <AnimatePresence>
        {sfxAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSfxAddModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              backdropFilter: 'blur(2px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
                minWidth: 360,
                maxWidth: 420,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{sfxAddModal.sfx.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Add &quot;{sfxAddModal.sfx.name}&quot; to project
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {sfxAddModal.sfx.category} &middot; {sfxAddModal.sfx.duration}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSfxAddModal(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Project</label>
                <select
                  value={sfxModalProject}
                  onChange={(e) => setSfxModalProject(e.target.value)}
                  style={selectStyle}
                >
                  {PROJECTS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Shot</label>
                <select
                  value={sfxModalShot}
                  onChange={(e) => setSfxModalShot(e.target.value)}
                  style={selectStyle}
                >
                  {SCENE_SHOTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setSfxAddModal(null)}
                  style={{
                    ...smallBtnStyle,
                    padding: '7px 14px',
                    fontSize: 12,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const proj = PROJECTS.find((p) => p.id === sfxModalProject);
                    const shot = SCENE_SHOTS.find((s) => s.id === sfxModalShot);
                    toast.success(
                      `SFX added to timeline — ${proj?.name ?? 'project'} / ${shot?.label ?? 'shot'}`
                    );
                    setSfxAddModal(null);
                  }}
                  style={{
                    ...primaryBtnStyle,
                    padding: '7px 14px',
                    fontSize: 12,
                    alignSelf: 'auto',
                  }}
                >
                  <Plus size={12} />
                  Add to Timeline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Voice Sample Upload Modal (AU-7) ───────────────── */}
      <AnimatePresence>
        {voiceUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setVoiceUploadModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
                width: '100%',
                maxWidth: 420,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ ...sectionTitleStyle, fontSize: 15 }}>Upload Voice Sample</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setVoiceUploadModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Upload a 30-second clean audio sample (WAV or MP3). The model will clone the voice
                characteristics for use in generation.
              </p>

              <label
                style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background: 'var(--bg-surface)',
                }}
              >
                <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Click to browse or drag a file
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  WAV, MP3 up to 10MB
                </span>
                <input type="file" accept="audio/*" aria-label="Upload voice sample" style={{ display: 'none' }} />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle} htmlFor="voice-name">Voice name</label>
                <input id="voice-name" type="text" placeholder="e.g. Narrator" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setVoiceUploadModalOpen(false)}
                  style={{ ...smallBtnStyle, padding: '7px 14px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Voice sample uploaded');
                    setVoiceUploadModalOpen(false);
                  }}
                  style={{
                    ...primaryBtnStyle,
                    padding: '7px 14px',
                    fontSize: 12,
                    alignSelf: 'auto',
                  }}
                >
                  <Upload size={12} />
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
