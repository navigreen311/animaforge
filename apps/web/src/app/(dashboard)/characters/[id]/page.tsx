'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useResource } from '@/lib/api/useResource';
import { useParams, useRouter } from 'next/navigation';
import {
  User,
  Eye,
  Pencil,
  Play,
  Trash2,
  Copy,
  FlaskConical,
  FolderOpen,
  Volume2,
  VolumeX,
  Plus,
  Download,
  Check,
  Smile,
  Frown,
  Meh,
  Angry,
  Heart,
  Zap,
  Mic,
  Upload,
  X,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Character, StyleMode, RightsScope } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { Toast, useToast } from '@/components/shared/Toast';
import HairTab from './HairTab';
import WardrobeTab from './WardrobeTab';

/* ── Mock Data ──────────────────────────────────────────────── */

/** GET /api/characters/[id]. */
interface CharacterRow {
  id: string;
  projectId: string | null;
  name: string;
  isDigitalTwin: boolean;
  faceModelUrl: string | null;
  bodyParams: Record<string, unknown> | null;
  hairParams: Record<string, unknown> | null;
  wardrobe: Record<string, unknown> | null;
  voiceId: string | null;
  styleMode: string;
  consentRecord: string | null;
  rightsStatus: string;
  createdAt: string;
  updatedAt: string;
}

type EditableCharacter = Character & {
  skinTone: string;
  age: number;
  build: string;
  hairColor: string;
  hairLength: number;
  facialHair: boolean;
  consentStatus: 'verified' | 'pending' | 'none';
};

function num(source: Record<string, unknown> | null, key: string, fallback: number): number {
  const v = source?.[key];
  return typeof v === 'number' ? v : fallback;
}

function str(source: Record<string, unknown> | null, key: string, fallback: string): string {
  const v = source?.[key];
  return typeof v === 'string' ? v : fallback;
}

/**
 * Map a stored character onto the editor.
 *
 * Skin tone, age, build, hair colour, hair length and facial hair are not
 * columns; they live inside the open `body_params` and `hair_params` JSON
 * blobs, so they are read from there and fall back to the editor's own
 * defaults when a character has never been saved with them.
 *
 * Three fields the header used to show are gone because nothing records them:
 * a description, a drift score, and a shot count. `lastUsedAt` is the row's
 * updatedAt, which is when it was last edited -- not when it was last rendered.
 */
function toEditable(row: CharacterRow): EditableCharacter {
  return {
    id: row.id,
    name: row.name,
    description: '',
    styleMode: row.styleMode as StyleMode,
    status: 'active',
    isDigitalTwin: row.isDigitalTwin,
    sourcePhotos: [],
    voiceId: row.voiceId ?? '',
    voiceName: '',
    projectIds: row.projectId ? [row.projectId] : [],
    driftScore: 0,
    // characters.rights_status is a free-form string; anything outside the
    // three the UI models is reported as personal rather than shown as a scope
    // that does not exist.
    rightsScope: (['personal', 'commercial', 'expired'] as const).includes(
      row.rightsStatus as RightsScope,
    )
      ? (row.rightsStatus as RightsScope)
      : 'personal',
    avatarColor: '#6366f1',
    shotCount: 0,
    lastUsedAt: row.updatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    skinTone: str(row.bodyParams, 'skinTone', '#D2A679'),
    age: num(row.bodyParams, 'age', 30),
    build: str(row.bodyParams, 'build', 'Average'),
    hairColor: str(row.hairParams, 'hairColor', '#1a1a2e'),
    hairLength: num(row.hairParams, 'hairLength', 40),
    facialHair: row.hairParams?.facialHair === true,
    // consent_record is a nullable id with no status column of its own; a
    // present record is treated as consent on file, absent as none. There is
    // no "pending" the data can express.
    consentStatus: row.consentRecord ? 'verified' : 'none',
  };
}

const STYLE_MODES: { value: StyleMode; label: string; gradient: string }[] = [
  { value: 'realistic', label: 'Realistic', gradient: 'linear-gradient(135deg, #334155, #1e293b)' },
  { value: 'anime', label: 'Anime', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { value: 'cartoon', label: 'Cartoon', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  {
    value: 'cel-shaded',
    label: 'Cel-Shaded',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  { value: 'pixel', label: 'Pixel', gradient: 'linear-gradient(135deg, #ec4899, #f97316)' },
  { value: 'clay', label: 'Clay', gradient: 'linear-gradient(135deg, #a16207, #854d0e)' },
];

const SKIN_TONES = [
  '#FDDBB4',
  '#E8B98D',
  '#D2A679',
  '#C68642',
  '#8D5524',
  '#6B3A1F',
  '#3B1F0B',
  '#F5D6C6',
];

const HAIR_COLORS = [
  '#1a1a2e',
  '#4a2c0a',
  '#8B4513',
  '#D2691E',
  '#DAA520',
  '#C0C0C0',
  '#DC143C',
  '#2E0854',
];

const BUILD_OPTIONS = ['Slim', 'Average', 'Athletic', 'Heavy'];

const VIEW_ANGLES = ['Front', 'Side', '3/4', 'Full Body'] as const;

const TABS = ['Appearance', 'Hair', 'Wardrobe', 'Voice', 'History', 'Export'] as const;
type Tab = (typeof TABS)[number];

const WARDROBE_CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Accessories'] as const;

const EXPORT_FORMATS = [
  { id: 'gltf', label: 'glTF 2.0', compat: 'Blender \u00b7 Unreal' },
  { id: 'fbx', label: 'FBX', compat: 'Maya \u00b7 Max \u00b7 Unity' },
  { id: 'usd', label: 'USD / USDZ', compat: 'Apple Vision Pro' },
  { id: 'bvh', label: 'BVH Motion', compat: 'MotionBuilder' },
  { id: 'arkit', label: 'ARKit', compat: 'iOS / Xcode' },
  { id: 'mp4', label: 'MP4 Rendered', compat: 'Any platform' },
];

const EMOTION_PREVIEWS = [
  { label: 'Neutral', Icon: Meh },
  { label: 'Happy', Icon: Smile },
  { label: 'Sad', Icon: Frown },
  { label: 'Angry', Icon: Angry },
  { label: 'Love', Icon: Heart },
  { label: 'Surprise', Icon: Zap },
];

/* ── Voice Modal Mock Voices ──────────────────────────────────── */

/* ── Drift Chart Data ─────────────────────────────────────────── */

/* ── Enhanced History Data ────────────────────────────────────── */

/* ── Helpers ─────────────────────────────────────────────────── */

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ── Component ───────────────────────────────────────────────── */

export default function CharacterDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast, toasts, dismiss } = useToast();
  const authToken = useAuthStore((s) => s.token);

  const state = useResource<CharacterRow>(`/api/characters/${params.id}`, [params.id]);
  const character = useMemo<EditableCharacter>(
    () =>
      state.data
        ? toEditable(state.data)
        : {
            id: params.id,
            name: '',
            description: '',
            styleMode: 'realistic',
            status: 'active',
            isDigitalTwin: false,
            sourcePhotos: [],
            voiceId: '',
            voiceName: '',
            projectIds: [],
            driftScore: 0,
            rightsScope: 'personal',
            avatarColor: '#6366f1',
            shotCount: 0,
            lastUsedAt: '',
            createdAt: '',
            updatedAt: '',
            skinTone: '#D2A679',
            age: 30,
            build: 'Average',
            hairColor: '#1a1a2e',
            hairLength: 40,
            facialHair: false,
            consentStatus: 'none',
          },
    [state.data, params.id],
  );

  // Voices come from the voice library the console already has.
  const voiceState = useResource<{ items: { id: string; name: string; style?: string }[] }>(
    '/api/voices',
  );
  const voiceLibrary = voiceState.data?.items ?? [];

  // Appearance history, drift over time and per-shot consistency scores all
  // came from three literals here: eight dated drift readings, three shots in
  // two named projects, and a score per shot. Nothing measures character
  // consistency and nothing links a character to the shots it appears in
  // (shots carry a character_refs id array with no back-reference and no
  // score), so there is no history to show.
  const history: {
    id: string;
    project: string;
    projectId: string;
    shotNumber: number;
    date: string;
    score: number;
  }[] = [];
  const driftSeries: { date: string; score: number }[] = [];
  const [activeTab, setActiveTab] = useState<Tab>('Appearance');
  const [activeView, setActiveView] = useState<(typeof VIEW_ANGLES)[number]>('Front');
  const [selectedStyle, setSelectedStyle] = useState<StyleMode>(character.styleMode);
  const [selectedSkin, setSelectedSkin] = useState(character.skinTone);
  const [age, setAge] = useState(character.age);
  const [build, setBuild] = useState(character.build);
  const [hairColor, setHairColor] = useState(character.hairColor);
  const [customHairHex, setCustomHairHex] = useState('');
  const [hairLength, setHairLength] = useState(character.hairLength);
  const [facialHair, setFacialHair] = useState(character.facialHair);
  const [wardrobeCategory, setWardrobeCategory] =
    useState<(typeof WARDROBE_CATEGORIES)[number]>('Tops');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(character.name);

  // The editor fields above are seeded from the stored character once it
  // arrives. Without this they would keep the placeholder defaults the first
  // render used, because useState only reads its initial value once.
  useEffect(() => {
    if (!state.data) return;
    const c = toEditable(state.data);
    setSelectedStyle(c.styleMode);
    setSelectedSkin(c.skinTone);
    setAge(c.age);
    setBuild(c.build);
    setHairColor(c.hairColor);
    setHairLength(c.hairLength);
    setFacialHair(c.facialHair);
    setEditName(c.name);
  }, [state.data]);

  /* Voice tab state */
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [pairedVoiceId, setPairedVoiceId] = useState<string | null>(character.voiceId ?? null);
  const [pairedVoiceName, setPairedVoiceName] = useState<string | null>(
    character.voiceName ?? null,
  );
  const [voiceModalTab, setVoiceModalTab] = useState<'select' | 'upload'>('select');
  const [uploadVoiceName, setUploadVoiceName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const router = useRouter();

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportAllLoading, setExportAllLoading] = useState(false);
  const [mp4Resolution, setMp4Resolution] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [mp4Duration, setMp4Duration] = useState(10);
  const [mp4Background, setMp4Background] = useState<'Transparent' | 'Black' | 'White'>('Black');

  /* Advanced facial sliders state */
  const [facialOpen, setFacialOpen] = useState(false);
  const [facialSliders, setFacialSliders] = useState<Record<string, number>>({
    eyeSize: 50,
    eyeSpacing: 50,
    noseWidth: 50,
    noseLength: 50,
    jawDefinition: 50,
    jawWidth: 50,
    lipFullness: 50,
    cheekVolume: 50,
  });
  const facialDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFacialSlider = useCallback((key: string, value: number) => {
    setFacialSliders((prev) => ({ ...prev, [key]: value }));
    if (facialDebounceRef.current) clearTimeout(facialDebounceRef.current);
    facialDebounceRef.current = setTimeout(() => {
      // Auto-save: would POST to API here
    }, 800);
  }, []);

  const handleExport = useCallback(
    (formatId: string, formatLabel: string) => {
      setExportingId(formatId);
      setTimeout(() => {
        setExportingId(null);
        toast.success(`Export ready: ${formatLabel}`);
      }, 2000);
    },
    [toast],
  );

  const handleExportAll = useCallback(() => {
    setExportAllLoading(true);
    setTimeout(() => {
      setExportAllLoading(false);
      toast.success('All exports ready (ZIP)');
    }, 2000);
  }, [toast]);

  const handleNameSave = useCallback(() => {
    setIsEditingName(false);
  }, []);

  /* ── Render: Tab Content ────────────────────────────────────── */

  function renderAppearanceTab() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Style Mode */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            Style Mode
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {STYLE_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setSelectedStyle(mode.value)}
                style={{
                  background: mode.gradient,
                  border:
                    selectedStyle === mode.value
                      ? '2px solid var(--brand-light)'
                      : '2px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 8px',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.15s',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            Skin Tone
          </h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SKIN_TONES.map((tone) => (
              <button
                key={tone}
                onClick={() => setSelectedSkin(tone)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: tone,
                  border:
                    selectedSkin === tone
                      ? '3px solid var(--brand-light)'
                      : '2px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                aria-label={`Skin tone ${tone}`}
              />
            ))}
          </div>
        </div>

        {/* Age Slider */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            Age: {age}
          </h4>
          <input
            type="range"
            min={18}
            max={80}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--brand)' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--text-tertiary)',
            }}
          >
            <span>18</span>
            <span>80</span>
          </div>
        </div>

        {/* Build Selector */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            Build
          </h4>
          <div style={{ display: 'flex', gap: 8 }}>
            {BUILD_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setBuild(opt)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border:
                    build === opt ? '1px solid var(--brand-border)' : '1px solid var(--border)',
                  backgroundColor: build === opt ? 'var(--bg-active)' : 'var(--bg-surface)',
                  color: build === opt ? 'var(--text-brand)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* ── Advanced Facial Features (collapsible) ── */}
        <div>
          <button
            type="button"
            onClick={() => setFacialOpen(!facialOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Advanced facial features</span>
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 200ms ease',
                transform: facialOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {facialOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
              {(
                [
                  { key: 'eyeSize', label: 'Eye size' },
                  { key: 'eyeSpacing', label: 'Eye spacing' },
                  { key: 'noseWidth', label: 'Nose width' },
                  { key: 'noseLength', label: 'Nose length' },
                  { key: 'jawDefinition', label: 'Jaw definition' },
                  { key: 'jawWidth', label: 'Jaw width' },
                  { key: 'lipFullness', label: 'Lip fullness' },
                  { key: 'cheekVolume', label: 'Cheek volume' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 24,
                        textAlign: 'right',
                      }}
                    >
                      {facialSliders[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={facialSliders[key]}
                    onChange={(e) => updateFacialSlider(key, Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--brand)',
                      height: 4,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emotion Previews */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            Emotion Previews
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {EMOTION_PREVIEWS.map(({ label, Icon }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <Icon size={20} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderHairTab() {
    return <HairTab characterId={params.id} token={authToken} />;
  }

  function renderWardrobeTab() {
    return <WardrobeTab characterId={params.id} token={authToken} />;
  }

  /* ── Web Audio preview helper ──────────────────────────────── */

  function playPreviewTone() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  function handleVoicePair(voiceId: string, voiceName: string) {
    setPairedVoiceId(voiceId);
    setPairedVoiceName(voiceName);
    setVoiceModalOpen(false);
    toast.success(`Voice "${voiceName}" paired`);
  }

  function handleVoiceUnpair() {
    setPairedVoiceId(null);
    setPairedVoiceName(null);
    toast.success('Voice unpaired');
  }

  function simulateUpload() {
    if (!uploadVoiceName.trim()) return;
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          handleVoicePair(`voice-custom-${Date.now()}`, uploadVoiceName);
          setUploadProgress(null);
          setUploadVoiceName('');
          return null;
        }
        return prev + 20;
      });
    }, 400);
  }

  /* ── Voice Selector Modal ──────────────────────────────────── */

  function renderVoiceSelectorModal() {
    return (
      <AnimatePresence>
        {voiceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setVoiceModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--radius-xl)',
                width: 440,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
                >
                  Pair a Voice
                </h2>
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(false)}
                  aria-label="Close"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 16,
                }}
              >
                {(['select', 'upload'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setVoiceModalTab(tab)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: 13,
                      fontWeight: 500,
                      border: 'none',
                      borderBottom:
                        voiceModalTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                      backgroundColor: 'transparent',
                      color: voiceModalTab === tab ? 'var(--text-brand)' : 'var(--text-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'select' ? 'Select existing' : 'Upload new sample'}
                  </button>
                ))}
              </div>

              {/* Select existing tab */}
              {voiceModalTab === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {voiceLibrary.map((voice) => (
                    <div
                      key={voice.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-surface)',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = 'var(--brand-border)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <Volume2 size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            margin: 0,
                          }}
                        >
                          {voice.name}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                          {voice.style}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={playPreviewTone}
                        style={{
                          background: 'transparent',
                          border: '0.5px solid var(--border)',
                          color: 'var(--text-secondary)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                      >
                        &#9654; Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoicePair(voice.id, voice.name)}
                        style={{
                          background: 'var(--brand)',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new sample tab */}
              {voiceModalTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                    }}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border-strong)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '32px 16px',
                      textAlign: 'center',
                      backgroundColor: dragOver ? 'var(--bg-active)' : 'var(--bg-surface)',
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Drop audio file here or click to browse
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      MP3, WAV, or M4A - max 10MB
                    </p>
                  </div>

                  {/* Voice name input */}
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Voice name
                    </label>
                    <input
                      type="text"
                      value={uploadVoiceName}
                      onChange={(e) => setUploadVoiceName(e.target.value)}
                      placeholder="e.g. My custom voice"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 13,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Create button + progress */}
                  <button
                    type="button"
                    onClick={simulateUpload}
                    disabled={!uploadVoiceName.trim() || uploadProgress !== null}
                    style={{
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      backgroundColor: uploadVoiceName.trim()
                        ? 'var(--brand)'
                        : 'var(--bg-surface)',
                      color: uploadVoiceName.trim() ? '#fff' : 'var(--text-tertiary)',
                      cursor: uploadVoiceName.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >
                    {uploadProgress !== null
                      ? `Creating... ${uploadProgress}%`
                      : 'Create Voice Clone'}
                  </button>

                  {uploadProgress !== null && (
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'var(--bg-surface)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${uploadProgress}%`,
                          backgroundColor: 'var(--brand)',
                          borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Voice Tab ─────────────────────────────────────────────── */

  function renderVoiceTab() {
    const hasPairedVoice = Boolean(pairedVoiceId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {hasPairedVoice ? (
          <>
            {/* Identity Lock Card */}
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                padding: 20,
              }}
            >
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 16,
                  margin: 0,
                }}
              >
                Identity Lock
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      Visual Identity
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                      Appearance locked to style reference
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      Audio Identity
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                      {pairedVoiceName} - Voice cloned and lip-sync ready
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={playPreviewTone}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--brand-border)',
                  backgroundColor: 'var(--bg-active)',
                  color: 'var(--text-brand)',
                  cursor: 'pointer',
                }}
              >
                <Play size={14} /> Preview voice
              </button>
              <button
                onClick={handleVoiceUnpair}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Unpair voice
              </button>
            </div>
          </>
        ) : (
          /* Unpaired state */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              paddingTop: 32,
              paddingBottom: 16,
            }}
          >
            <Mic size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.2 }} />
            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              No voice paired
            </h4>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                maxWidth: 280,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Pair a voice to enable voice cloning and automatic lip-sync for this character across
              all projects.
            </p>
            <button
              onClick={() => {
                setVoiceModalTab('select');
                setVoiceModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand-border)',
                backgroundColor: 'var(--brand-dim)',
                color: 'var(--text-brand)',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              <Plus size={14} /> Pair a Voice
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── History Tab ───────────────────────────────────────────── */

  function renderHistoryTab() {
    const hasHistory = history.length > 0;
    const uniqueProjects = new Set(history.map((e) => e.projectId));

    function scoreColor(score: number) {
      if (score > 80)
        return { bg: 'rgba(52, 211, 153, 0.12)', fg: '#6ee7b7', border: 'rgba(52, 211, 153, 0.3)' };
      if (score >= 60)
        return { bg: 'rgba(234, 179, 8, 0.12)', fg: '#fbbf24', border: 'rgba(234, 179, 8, 0.3)' };
      return { bg: 'rgba(248, 113, 113, 0.12)', fg: '#f87171', border: 'rgba(248, 113, 113, 0.3)' };
    }

    if (!hasHistory) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            paddingTop: 40,
            paddingBottom: 20,
          }}
        >
          <FolderOpen size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
            This character hasn&apos;t been used in any shots yet.
          </p>
          <button
            onClick={() => router.push('/projects')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--brand-border)',
              backgroundColor: 'var(--brand-dim)',
              color: 'var(--text-brand)',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Use in Project &rarr;
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Drift Score Chart */}
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 16px 8px',
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              margin: '0 0 12px 0',
            }}
          >
            Drift Score Over Time
          </h4>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={driftSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <ReferenceLine y={80} stroke="#34d399" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={60} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#8b5cf6' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Shot History List */}
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Appears in {history.length} shots across {uniqueProjects.size} projects
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((entry) => {
              const sc = scoreColor(entry.score);
              return (
                <div
                  key={entry.id}
                  onClick={() => router.push(`/projects/${entry.projectId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Project thumbnail placeholder */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FolderOpen size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      {entry.project} &rarr; Shot {entry.shotNumber}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        marginTop: 2,
                        margin: 0,
                      }}
                    >
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: sc.bg,
                      color: sc.fg,
                      border: `1px solid ${sc.border}`,
                      flexShrink: 0,
                    }}
                  >
                    {entry.score}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderExportTab() {
    const isExporting = (id: string) => exportingId === id;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}
        >
          Export Formats
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {EXPORT_FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 20,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {fmt.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmt.compat}</span>

              {/* MP4 extra settings */}
              {fmt.id === 'mp4' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Resolution
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['720p', '1080p', '4K'] as const).map((r) => (
                        <label
                          key={r}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color:
                              mp4Resolution === r ? 'var(--text-brand)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="mp4res"
                            checked={mp4Resolution === r}
                            onChange={() => setMp4Resolution(r)}
                            style={{ accentColor: 'var(--brand)' }}
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Duration: {mp4Duration}s
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={mp4Duration}
                      onChange={(e) => setMp4Duration(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--brand)' }}
                    />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Background
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['Transparent', 'Black', 'White'] as const).map((bg) => (
                        <label
                          key={bg}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color:
                              mp4Background === bg ? 'var(--text-brand)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="mp4bg"
                            checked={mp4Background === bg}
                            onChange={() => setMp4Background(bg)}
                            style={{ accentColor: 'var(--brand)' }}
                          />
                          {bg}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleExport(fmt.id, fmt.label)}
                disabled={isExporting(fmt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 'auto',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--brand)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isExporting(fmt.id) ? 'not-allowed' : 'pointer',
                  opacity: isExporting(fmt.id) ? 0.7 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                {isExporting(fmt.id) ? (
                  <>
                    <svg
                      className="spin"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Exporting&hellip;
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Download All (ZIP) */}
        <button
          onClick={handleExportAll}
          disabled={exportAllLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--brand-border)',
            backgroundColor: 'var(--brand-dim)',
            color: 'var(--text-brand)',
            fontSize: 13,
            fontWeight: 600,
            cursor: exportAllLoading ? 'not-allowed' : 'pointer',
            opacity: exportAllLoading ? 0.7 : 1,
            transition: 'opacity 150ms, background-color 150ms',
          }}
        >
          {exportAllLoading ? (
            <>
              <svg
                className="spin"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Exporting All&hellip;
            </>
          ) : (
            <>
              <Download size={16} />
              Download All (ZIP)
            </>
          )}
        </button>
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'Appearance':
        return renderAppearanceTab();
      case 'Hair':
        return renderHairTab();
      case 'Wardrobe':
        return renderWardrobeTab();
      case 'Voice':
        return renderVoiceTab();
      case 'History':
        return renderHistoryTab();
      case 'Export':
        return renderExportTab();
    }
  }

  /* ── Drift Score Gauge ──────────────────────────────────────── */

  function DriftGauge({ score }: { score: number }) {
    const circumference = 2 * Math.PI * 42;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="96" height="96" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize="22"
            fontWeight="700"
          >
            {score}
          </text>
          <text x="50" y="62" textAnchor="middle" fill="var(--text-tertiary)" fontSize="11">
            /100
          </text>
        </svg>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Drift Score</span>
      </div>
    );
  }

  /* ── Main Render ────────────────────────────────────────────── */

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 360,
          }}
        >
          {toasts.map((t) => (
            <Toast key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
      )}

      {/* Voice Selector Modal */}
      {renderVoiceSelectorModal()}

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
          Characters / {character.name}
        </p>
      </div>

      {/* Two-Column Layout */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* ── LEFT COLUMN (60%) ─────────────────────────────────── */}
        <div style={{ flex: '0 0 60%', minWidth: 0 }}>
          {/* Preview Area — shows image if available, placeholder + generate button otherwise */}
          {(() => {
            const viewKey = activeView.toLowerCase().replace('/', '');
            const previewSrc = character.previewUrls?.[viewKey] ?? character.thumbnailUrl ?? null;
            if (previewSrc) {
              return (
                <div
                  style={{
                    height: 300,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={`${character.name} - ${activeView} view`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: 'var(--bg-surface)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 10,
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      background: 'rgba(0,0,0,0.55)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {activeView} View
                  </span>
                </div>
              );
            }
            return (
              <div
                style={{
                  height: 300,
                  backgroundColor: 'var(--bg-surface)',
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <User size={48} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {activeView} View
                </span>
                <button
                  type="button"
                  onClick={() => toast.info('Generating preview...')}
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--brand-border)',
                    backgroundColor: 'var(--brand-dim)',
                    color: 'var(--text-brand)',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--brand)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--brand-dim)';
                    e.currentTarget.style.color = 'var(--text-brand)';
                  }}
                >
                  <Zap size={13} /> Generate preview
                </button>
              </div>
            );
          })()}

          {/* View Angle Toggles */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 12,
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-pill)',
              padding: 3,
              width: 'fit-content',
            }}
          >
            {VIEW_ANGLES.map((angle) => (
              <button
                key={angle}
                onClick={() => setActiveView(angle)}
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  backgroundColor: activeView === angle ? 'var(--brand)' : 'transparent',
                  color: activeView === angle ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {angle}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              marginTop: 24,
              borderBottom: '1px solid var(--border)',
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderBottom:
                    activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeTab === tab ? 'var(--text-brand)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ marginTop: 20, minHeight: 300 }}>{renderTabContent()}</div>
        </div>

        {/* ── RIGHT COLUMN (40%) ────────────────────────────────── */}
        <div
          style={{
            flex: '0 0 40%',
            maxWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Character Name (editable) */}
          <div>
            {isEditingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: 18,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--brand-border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleNameSave}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--brand-border)',
                    backgroundColor: 'var(--brand)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setIsEditingName(true)}
              >
                <h1
                  style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
                >
                  {editName}
                </h1>
                <Pencil size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              ID: {params.id}
            </p>
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* Character Status */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 'var(--radius-pill)',
                backgroundColor:
                  character.status === 'active'
                    ? 'rgba(52, 211, 153, 0.12)'
                    : character.status === 'draft'
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(234, 179, 8, 0.12)',
                color:
                  character.status === 'active'
                    ? '#6ee7b7'
                    : character.status === 'draft'
                      ? 'rgba(255, 255, 255, 0.4)'
                      : '#fbbf24',
                border: `1px solid ${
                  character.status === 'active'
                    ? 'rgba(52, 211, 153, 0.3)'
                    : character.status === 'draft'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(234, 179, 8, 0.3)'
                }`,
                textTransform: 'capitalize',
              }}
            >
              {character.status}
            </span>

            {/* Digital Twin Badge */}
            {character.isDigitalTwin && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#67e8f9',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                Digital Twin
              </span>
            )}

            {/* Consent Status */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 'var(--radius-pill)',
                backgroundColor:
                  character.consentStatus === 'verified'
                    ? 'rgba(52, 211, 153, 0.12)'
                    : 'rgba(234, 179, 8, 0.12)',
                color: character.consentStatus === 'verified' ? '#6ee7b7' : '#fbbf24',
                border: `1px solid ${
                  character.consentStatus === 'verified'
                    ? 'rgba(52, 211, 153, 0.3)'
                    : 'rgba(234, 179, 8, 0.3)'
                }`,
              }}
            >
              {character.consentStatus === 'verified' && <Check size={10} />}
              Consent: {character.consentStatus}
            </span>
          </div>

          {/* Drift Score Gauge */}
          <div
            style={{
              padding: 16,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <DriftGauge score={character.driftScore ?? 0} />
          </div>

          {/* Metadata */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Last used</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {character.lastUsedAt ? timeAgo(character.lastUsedAt) : 'Never'}
              </span>
            </div>
            <div
              style={{
                height: 1,
                backgroundColor: 'var(--border)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Created</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {formatDate(character.createdAt)}
              </span>
            </div>
            <div
              style={{
                height: 1,
                backgroundColor: 'var(--border)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Shots</span>
              <span style={{ color: 'var(--text-secondary)' }}>{character.shotCount}</span>
            </div>
            <div
              style={{
                height: 1,
                backgroundColor: 'var(--border)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Rights</span>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {character.rightsScope ?? 'N/A'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => toast.info('Generating test shot...')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--brand)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                width: '100%',
              }}
            >
              <FlaskConical size={15} /> Generate Test Shot
            </button>

            <button
              onClick={() => toast.info('Opening project selector...')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand-border)',
                backgroundColor: 'var(--brand-dim)',
                color: 'var(--text-brand)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <FolderOpen size={15} /> Use in Project
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => toast.success('Character cloned')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Copy size={14} /> Clone
              </button>
              <button
                onClick={() => toast.warning('Are you sure? This cannot be undone.')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#f87171',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
