'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, User, Check, Loader, Plus, X, Camera, AlertTriangle,
  Sun, Glasses, ChevronDown, ChevronRight, Play, Pause, Download,
  RotateCcw, Trash2, Edit3, FolderOpen, MoreHorizontal, Mic,
  Volume2, SkipForward, Lock, Monitor, Film, Box, Smartphone,
  Layers, Eye, Smile, Frown, Angry, Meh, HelpCircle,
  Shirt, Footprints, Wind, Sparkles, Move, Sliders, Save,
  CloudUpload, CheckCircle2, Circle, Music, FileVideo, Package,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type PipelineStepId = 'upload' | 'detect' | 'reconstruct' | 'rig' | 'texture' | 'animate' | 'voice' | 'export';
type StepStatus = 'completed' | 'current' | 'future';
type StyleMode = 'realistic' | 'anime' | 'cartoon' | 'cel-shaded' | 'pixel' | 'clay';
type EditTab = 'appearance' | 'hair' | 'wardrobe' | 'expression' | 'animation';
type WardrobeCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessories';
type ExportFormat = 'gltf' | 'fbx' | 'usd' | 'bvh' | 'arkit' | 'mp4';

interface UploadedPhoto {
  id: string;
  name: string;
  size: number;
  url: string;
  faceDetected: boolean | null;
  goodLighting: boolean | null;
  lowResolution: boolean;
  hasGlasses: boolean;
}

interface PipelineStep {
  id: PipelineStepId;
  label: string;
  index: number;
}

// ── Constants ────────────────────────────────────────────────
const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'upload', label: 'Upload', index: 0 },
  { id: 'detect', label: 'Detect', index: 1 },
  { id: 'reconstruct', label: 'Reconstruct', index: 2 },
  { id: 'rig', label: 'Rig', index: 3 },
  { id: 'texture', label: 'Texture', index: 4 },
  { id: 'animate', label: 'Animate', index: 5 },
  { id: 'voice', label: 'Voice', index: 6 },
  { id: 'export', label: 'Export', index: 7 },
];

const PROCESSING_DURATIONS: Partial<Record<PipelineStepId, number>> = {
  detect: 3000,
  reconstruct: 8000,
  rig: 5000,
  texture: 10000,
  animate: 5000,
};

const STYLE_MODES: { id: StyleMode; label: string; icon: string; desc: string }[] = [
  { id: 'realistic', label: 'Realistic', icon: '🎭', desc: 'Photorealistic digital twin' },
  { id: 'anime', label: 'Anime', icon: '✨', desc: 'Japanese animation style' },
  { id: 'cartoon', label: 'Cartoon', icon: '🎨', desc: 'Western cartoon aesthetic' },
  { id: 'cel-shaded', label: 'Cel-shaded', icon: '🖌️', desc: 'Flat shading, bold outlines' },
  { id: 'pixel', label: 'Pixel', icon: '👾', desc: 'Retro pixel art style' },
  { id: 'clay', label: 'Clay', icon: '🧱', desc: 'Claymation / stop-motion feel' },
];

const SKIN_TONES = ['#FFDBB4', '#E8B98D', '#D08B5B', '#AE5D29', '#694D3D', '#3B2219', '#F5D7C3', '#C68642'];
const BUILD_OPTIONS = ['Slim', 'Average', 'Athletic', 'Muscular', 'Heavy'];
const HAIR_STYLES = ['Straight', 'Wavy', 'Curly', 'Coily', 'Buzz', 'Bald', 'Ponytail', 'Braids'];
const HAIR_COLORS = ['#1a1a1a', '#4a3728', '#8B4513', '#D2691E', '#DAA520', '#CD853F', '#F5DEB3', '#C0C0C0'];
const FASHION_HAIR_COLORS = ['#FF0000', '#FF69B4', '#8A2BE2', '#00BFFF', '#00FF7F', '#FFD700'];
const HAIR_TEXTURES = ['Smooth', 'Silky', 'Coarse', 'Frizzy'];
const EMOTIONS: { id: string; label: string; emoji: string }[] = [
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'happy', label: 'Happy', emoji: '😄' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'angry', label: 'Angry', emoji: '😠' },
  { id: 'surprised', label: 'Surprised', emoji: '😲' },
  { id: 'fearful', label: 'Fearful', emoji: '😨' },
  { id: 'disgusted', label: 'Disgusted', emoji: '🤢' },
  { id: 'thinking', label: 'Thinking', emoji: '🤔' },
];
const FACS_UNITS = ['AU1 Inner Brow Raise', 'AU2 Outer Brow Raise', 'AU4 Brow Lowerer', 'AU5 Upper Lid Raise', 'AU6 Cheek Raise', 'AU7 Lid Tightener', 'AU12 Lip Corner Puller', 'AU25 Lips Part'];
const IDLE_STYLES = ['Subtle', 'Normal', 'Expressive'];
const MOTION_PRESETS = ['Breathing', 'Idle Sway', 'Looking Around', 'Talking Gesture', 'Confident Stance', 'Relaxed'];

const EXPORT_FORMATS: { id: ExportFormat; label: string; desc: string; ext: string }[] = [
  { id: 'gltf', label: 'glTF 2.0', desc: 'Web & real-time engines', ext: '.glb' },
  { id: 'fbx', label: 'FBX', desc: 'Maya, Blender, Unreal', ext: '.fbx' },
  { id: 'usd', label: 'USD', desc: 'Pixar Universal Scene', ext: '.usdz' },
  { id: 'bvh', label: 'BVH', desc: 'Motion capture data', ext: '.bvh' },
  { id: 'arkit', label: 'ARKit', desc: 'Apple AR blendshapes', ext: '.json' },
  { id: 'mp4', label: 'MP4 Video', desc: 'Turntable / preview clip', ext: '.mp4' },
];

const MP4_RESOLUTIONS = ['720p', '1080p', '4K'];
const MP4_DURATIONS = ['5s', '10s', '15s', '30s'];
const MP4_BACKGROUNDS = ['Transparent', 'Black', 'White', 'Gradient', 'Studio'];

const VOICE_PRESETS = [
  { id: 'v1', name: 'Nova', desc: 'Warm, professional female' },
  { id: 'v2', name: 'Atlas', desc: 'Deep, authoritative male' },
  { id: 'v3', name: 'Echo', desc: 'Neutral, androgynous' },
  { id: 'v4', name: 'Bloom', desc: 'Youthful, energetic' },
];

const SAMPLE_AVATARS = [
  { id: 'avatar-1', name: 'Luna Avatar', status: 'complete' as const, style: 'Realistic', quality: 92, gradient: 'linear-gradient(135deg, #10b981, #34d399)', thumbnailUrl: null as string | null },
  { id: 'avatar-2', name: 'Dr. Echo Avatar', status: 'draft' as const, style: 'Anime', quality: 78, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', thumbnailUrl: null as string | null },
];

// ── Helpers ──────────────────────────────────────────────────
function getStepStatus(stepIndex: number, currentIndex: number): StepStatus {
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'future';
}

function getQualityLabel(score: number): string {
  if (score >= 95) return 'Excellent';
  if (score >= 85) return 'Great';
  if (score >= 70) return 'Good';
  return 'Fair';
}

function QualityGauge({ score, status }: { score?: number; status?: 'idle' | 'processing' | 'complete' }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const isComplete = status === 'complete' && score !== undefined;
  const isProcessing = status === 'processing';

  if (!isComplete) {
    return (
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <text x="44" y="40" textAnchor="middle" fill="var(--text-tertiary)" fontSize="18" fontWeight="700">--</text>
        <text x="44" y="56" textAnchor="middle" fill="var(--text-tertiary)" fontSize="8">
          {isProcessing ? 'Calculating...' : 'Pending reconstruction'}
        </text>
      </svg>
    );
  }

  const offset = c - (score / 100) * c;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="44" y="36" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="700">{score}</text>
      <text x="44" y="50" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">Quality</text>
      <text x="44" y="62" textAnchor="middle" fill={color} fontSize="8" fontWeight="600">{getQualityLabel(score)}</text>
    </svg>
  );
}

function SliderControl({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}{unit ?? ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer', height: 4 }}
      />
    </div>
  );
}

function SwatchRow({ colors, selected, onSelect, size }: {
  colors: string[]; selected: string; onSelect: (c: string) => void; size?: number;
}) {
  const s = size ?? 24;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {colors.map(c => (
        <button
          key={c} onClick={() => onSelect(c)}
          style={{
            width: s, height: s, borderRadius: '50%', background: c, border: selected === c ? '2px solid #fff' : '2px solid transparent',
            cursor: 'pointer', outline: selected === c ? '2px solid var(--brand)' : 'none', outlineOffset: 1, padding: 0,
          }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
      {children}
    </span>
  );
}

function Btn({ children, primary, small, disabled, onClick, style: sx }: {
  children: React.ReactNode; primary?: boolean; small?: boolean; disabled?: boolean; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        padding: small ? '5px 10px' : '8px 16px',
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        border: primary ? 'none' : '1px solid var(--border)',
        background: primary ? 'var(--brand)' : 'transparent',
        color: primary ? '#fff' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
        ...sx,
      }}
    >
      {children}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function AvatarStudioPage() {
  // Pipeline state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [pipelineComplete, setPipelineComplete] = useState(false);

  // Upload state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [avatarName, setAvatarName] = useState('');
  const [styleMode, setStyleMode] = useState<StyleMode>('realistic');
  const [consentChecked, setConsentChecked] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editTab, setEditTab] = useState<EditTab>('appearance');
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [age, setAge] = useState(30);
  const [build, setBuild] = useState('Average');
  const [height, setHeight] = useState(170);
  const [genderSlider, setGenderSlider] = useState(50);
  const [showAdvancedFace, setShowAdvancedFace] = useState(false);
  const [jawWidth, setJawWidth] = useState(50);
  const [cheekHeight, setCheekHeight] = useState(50);
  const [noseWidth, setNoseWidth] = useState(50);
  const [eyeSize, setEyeSize] = useState(50);
  const [lipFullness, setLipFullness] = useState(50);

  // Hair
  const [hairStyle, setHairStyle] = useState('Straight');
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [hairTexture, setHairTexture] = useState('Smooth');
  const [hairLength, setHairLength] = useState(50);
  const [hairVolume, setHairVolume] = useState(50);
  const [facialHair, setFacialHair] = useState(false);

  // Wardrobe
  const [wardrobeCategory, setWardrobeCategory] = useState<WardrobeCategory>('top');
  const [fabricType, setFabricType] = useState('Cotton');
  const [patternType, setPatternType] = useState('Solid');
  const [outfitColor, setOutfitColor] = useState('#1a1a2e');

  // Expression
  const [selectedEmotion, setSelectedEmotion] = useState('neutral');
  const [showFACS, setShowFACS] = useState(false);
  const [facsValues, setFacsValues] = useState<Record<string, number>>(
    Object.fromEntries(FACS_UNITS.map(u => [u, 0]))
  );

  // Animation
  const [idleStyle, setIdleStyle] = useState('Normal');
  const [breathingEnabled, setBreathingEnabled] = useState(true);
  const [breathingIntensity, setBreathingIntensity] = useState(50);
  const [swayEnabled, setSwayEnabled] = useState(true);
  const [swayIntensity, setSwayIntensity] = useState(30);
  const [eyeMovement, setEyeMovement] = useState(true);
  const [eyeFrequency, setEyeFrequency] = useState(40);
  const [selectedPreset, setSelectedPreset] = useState('Breathing');

  // Voice
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [voiceUpload, setVoiceUpload] = useState(false);
  const [voiceName, setVoiceName] = useState('');

  // Export
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set(['gltf']));
  const [mp4Resolution, setMp4Resolution] = useState('1080p');
  const [mp4Duration, setMp4Duration] = useState('10s');
  const [mp4Background, setMp4Background] = useState('Black');

  // Expression intensity
  const [emotionIntensity, setEmotionIntensity] = useState(75);

  // Animation speed
  const [animationSpeed, setAnimationSpeed] = useState(50);

  // Export per-format download state
  const [downloadingFormats, setDownloadingFormats] = useState<Set<ExportFormat>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Properties panel
  const [qualityScore] = useState(87);

  // ── Processing auto-progression ────────────────────────────
  useEffect(() => {
    const processingSteps: PipelineStepId[] = ['detect', 'reconstruct', 'rig', 'texture', 'animate'];
    const step = PIPELINE_STEPS[currentStepIndex];
    if (!step) return;

    const dur = PROCESSING_DURATIONS[step.id];
    if (!dur) return;

    if (!processingSteps.includes(step.id)) return;

    setProcessingStartTime(Date.now());
    setProcessingElapsed(0);

    const interval = setInterval(() => {
      setProcessingElapsed(prev => {
        const next = prev + 100;
        if (next >= dur) {
          clearInterval(interval);
          setTimeout(() => setCurrentStepIndex(i => i + 1), 200);
        }
        return Math.min(next, dur);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex]);

  // Detect when all processing steps are done (land on voice step)
  useEffect(() => {
    if (currentStepIndex === 6 && !pipelineComplete) {
      // Landed on voice step after animate completed
    }
  }, [currentStepIndex, pipelineComplete]);

  // ── Delayed quality check (1.5s after upload) ─────────────
  useEffect(() => {
    const unchecked = photos.filter(p => p.faceDetected === null);
    if (unchecked.length === 0) return;

    const timer = setTimeout(() => {
      setPhotos(prev => prev.map(p =>
        p.faceDetected === null
          ? { ...p, faceDetected: Math.random() > 0.1, goodLighting: Math.random() > 0.25 }
          : p
      ));
    }, 1500);
    return () => clearTimeout(timer);
  }, [photos]);

  // ── File handling ──────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    const newPhotos: UploadedPhoto[] = [];

    for (let i = 0; i < files.length && photos.length + newPhotos.length < 3; i++) {
      const f = files[i];
      if (!allowed.includes(f.type)) continue;
      if (f.size > maxSize) continue;
      newPhotos.push({
        id: `photo-${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        url: URL.createObjectURL(f),
        faceDetected: null,
        goodLighting: null,
        lowResolution: f.size < 200 * 1024,
        hasGlasses: Math.random() > 0.7,
      });
    }
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 3));
  }, [photos.length]);

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const startReconstruction = () => {
    if (photos.length === 0 || !consentChecked || !avatarName.trim()) return;
    setCurrentStepIndex(1); // Move to Detect
  };

  // ── Step click handler ─────────────────────────────────────
  const handleStepClick = (index: number) => {
    if (index < currentStepIndex) {
      setCurrentStepIndex(index);
    }
  };

  // ── Render helpers ─────────────────────────────────────────
  const currentStep = PIPELINE_STEPS[currentStepIndex];
  const isProcessing = ['detect', 'reconstruct', 'rig', 'texture', 'animate'].includes(currentStep?.id ?? '');
  const editingUnlocked = currentStepIndex >= 6; // After animate completes

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Avatar Studio
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Create photorealistic digital humans from photos
            </p>
          </div>
          <Btn primary onClick={() => { setCurrentStepIndex(0); setPhotos([]); setAvatarName(''); setConsentChecked(false); setPipelineComplete(false); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Avatar
            </span>
          </Btn>
        </div>

        {/* ═══ PIPELINE STEPPER ═══ */}
        <div style={{
          background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            {PIPELINE_STEPS.map((step, index) => {
              const status = getStepStatus(index, currentStepIndex);
              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    position: 'relative', flex: 1,
                    cursor: status === 'completed' ? 'pointer' : 'default',
                  }}
                >
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 11, left: '50%', width: '100%', height: 2,
                      background: status === 'completed' ? '#22c55e' : '#374151', zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: status === 'completed' ? '#22c55e' : 'var(--bg-surface)',
                    border: `2px solid ${status === 'completed' ? '#22c55e' : status === 'current' ? '#eab308' : '#374151'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, zIndex: 1, position: 'relative',
                    color: status === 'completed' ? '#fff' : status === 'current' ? '#eab308' : '#6b7280',
                    animation: status === 'current' ? 'pulse 2s ease-in-out infinite' : undefined,
                  }}>
                    {status === 'completed' ? <Check size={11} strokeWidth={3} /> : status === 'current' && isProcessing ? <Loader size={11} style={{ animation: 'spin 1.5s linear infinite' }} /> : index + 1}
                  </div>
                  <span style={{
                    fontSize: 10, marginTop: 6,
                    color: status === 'completed' ? '#22c55e' : status === 'current' ? '#eab308' : 'var(--text-tertiary)',
                    fontWeight: status === 'current' ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overall pipeline progress bar */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              width: '100%', height: 4, borderRadius: 2,
              background: 'var(--border)', overflow: 'hidden',
            }}>
              <div style={{
                width: `${(currentStepIndex / PIPELINE_STEPS.length) * 100}%`,
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #22c55e, var(--brand))',
                transition: 'width 300ms ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Step {Math.min(currentStepIndex + 1, PIPELINE_STEPS.length)} of {PIPELINE_STEPS.length}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {Math.round((currentStepIndex / PIPELINE_STEPS.length) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT AREA ═══ */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left: Main panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── UPLOAD STEP ── */}
            {currentStep?.id === 'upload' && (
              <div style={{
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 20,
              }}>
                {/* Drag-drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    background: dragOver ? 'var(--brand-dim)' : 'var(--bg-surface)',
                    padding: '40px 20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 12, cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  <Upload size={36} style={{ color: dragOver ? 'var(--brand-light)' : 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Drag & drop 1-3 photos here
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    JPG, PNG, or WEBP - Max 10MB each
                  </span>
                  <input
                    ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp"
                    multiple style={{ display: 'none' }}
                    onChange={e => handleFiles(e.target.files)}
                  />
                </div>

                {/* Photo previews */}
                {photos.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {photos.map(photo => (
                      <div key={photo.id} style={{
                        position: 'relative', width: 140, borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-surface)',
                      }}>
                        <img
                          src={photo.url} alt={photo.name}
                          style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); removePhoto(photo.id); }}
                          style={{
                            position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                            borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', padding: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {photo.name}
                          </span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {photo.faceDetected === null ? (
                              <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Analyzing...</span>
                            ) : (
                              <>
                                <span style={{ fontSize: 9, color: photo.faceDetected ? '#22c55e' : '#ef4444' }}>
                                  {photo.faceDetected ? 'Face detected ✓' : 'No face ✗'}
                                </span>
                                <span style={{ fontSize: 9, color: photo.goodLighting ? '#22c55e' : '#eab308' }}>
                                  {photo.goodLighting ? 'Good lighting ✓' : 'Low light ⚠'}
                                </span>
                                {photo.lowResolution && (
                                  <span style={{ fontSize: 9, color: '#eab308' }}>Low resolution ⚠</span>
                                )}
                                {photo.hasGlasses && (
                                  <span style={{ fontSize: 9, color: '#eab308' }}>Glasses ⚠</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: 140, height: 130, borderRadius: 'var(--radius-md)',
                          border: '2px dashed var(--border)', background: 'var(--bg-surface)',
                          cursor: 'pointer', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'border-color 150ms ease',
                        }}
                      >
                        <Plus size={20} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Add Photo</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Avatar name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SectionLabel>Avatar Name</SectionLabel>
                  <input
                    type="text" value={avatarName} onChange={e => setAvatarName(e.target.value)}
                    placeholder="e.g. My Digital Twin"
                    style={{
                      padding: '8px 12px', fontSize: 13, borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'var(--bg-surface)',
                      color: 'var(--text-primary)', outline: 'none', width: '100%',
                    }}
                  />
                </div>

                {/* Style mode cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionLabel>Style Mode</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {STYLE_MODES.map(mode => (
                      <button
                        key={mode.id} onClick={() => setStyleMode(mode.id)}
                        style={{
                          padding: '12px 8px', borderRadius: 'var(--radius-md)',
                          border: styleMode === mode.id ? '2px solid var(--brand-light)' : '1px solid var(--border)',
                          background: styleMode === mode.id ? 'var(--brand-dim)' : 'var(--bg-surface)',
                          cursor: 'pointer', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 6, transition: 'all 150ms ease',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{mode.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{mode.label}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.3 }}>{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consent checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)}
                    style={{ marginTop: 2, accentColor: 'var(--brand)' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    I confirm I have the right to use these images and consent to generating an AI avatar.
                    The uploaded photos will be processed according to our privacy policy.
                  </span>
                </label>

                {/* Start button */}
                {(() => {
                  const canStart = photos.length > 0 && consentChecked && avatarName.trim().length > 0;
                  const missingParts: string[] = [];
                  if (photos.length === 0) missingParts.push('Upload at least one photo');
                  if (!avatarName.trim()) missingParts.push('Enter an avatar name');
                  if (!consentChecked) missingParts.push('Accept consent checkbox');
                  return (
                    <button
                      title={canStart ? 'Start avatar reconstruction' : `Missing: ${missingParts.join(', ')}`}
                      disabled={!canStart}
                      onClick={startReconstruction}
                      style={{
                        padding: '8px 16px', fontSize: 12, fontWeight: 600,
                        borderRadius: 'var(--radius-md)', border: 'none',
                        background: 'var(--brand)', color: '#fff',
                        cursor: canStart ? 'pointer' : 'not-allowed',
                        opacity: canStart ? 1 : 0.45,
                        transition: 'all 150ms ease',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <Sparkles size={14} /> Start Reconstruction
                    </button>
                  );
                })()}
              </div>
            )}

            {/* ── PROCESSING STEPS ── */}
            {isProcessing && (
              <div style={{
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 300, height: 300, borderRadius: 'var(--radius-xl)',
                  background: 'var(--bg-surface)', border: '2px dashed var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <User size={48} style={{ color: 'var(--text-tertiary)' }} />
                  <Loader size={20} style={{ color: '#eab308', animation: 'spin 1.5s linear infinite' }} />
                </div>

                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentStep.label}...
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {currentStep.id === 'detect' && 'Detecting facial landmarks and features'}
                    {currentStep.id === 'reconstruct' && 'Building 3D mesh from photographs'}
                    {currentStep.id === 'rig' && 'Generating skeletal rig and blend shapes'}
                    {currentStep.id === 'texture' && 'Projecting and refining texture maps'}
                    {currentStep.id === 'animate' && 'Applying idle animations and lip sync'}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <div style={{
                    width: '100%', height: 6, borderRadius: 3,
                    background: 'var(--border)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(processingElapsed / (PROCESSING_DURATIONS[currentStep.id] ?? 1)) * 100}%`,
                      height: '100%', borderRadius: 3,
                      background: 'linear-gradient(90deg, var(--brand), #eab308)',
                      transition: 'width 100ms linear',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {(processingElapsed / 1000).toFixed(1)}s
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {((PROCESSING_DURATIONS[currentStep.id] ?? 0) / 1000).toFixed(0)}s est.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── EDITING TABS (after animate completes, also visible at voice/export) ── */}
            {editingUnlocked && (
              <div style={{
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              }}>
                {/* Tab bar */}
                <div style={{
                  display: 'flex', borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                }}>
                  {(['appearance', 'hair', 'wardrobe', 'expression', 'animation'] as EditTab[]).map(tab => (
                    <button
                      key={tab} onClick={() => setEditTab(tab)}
                      style={{
                        flex: 1, padding: '10px 8px', fontSize: 11, fontWeight: 600,
                        background: editTab === tab ? 'var(--bg-elevated)' : 'transparent',
                        color: editTab === tab ? 'var(--brand-light)' : 'var(--text-secondary)',
                        border: 'none', borderBottom: editTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                        cursor: 'pointer', textTransform: 'capitalize', transition: 'all 150ms',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* ── Appearance ── */}
                  {editTab === 'appearance' && (
                    <>
                      {/* Style modes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <SectionLabel>Style Mode</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                          {STYLE_MODES.map(mode => (
                            <button
                              key={mode.id} onClick={() => setStyleMode(mode.id)}
                              style={{
                                padding: '8px 6px', borderRadius: 'var(--radius-md)',
                                border: styleMode === mode.id ? '2px solid var(--brand-light)' : '1px solid var(--border)',
                                background: styleMode === mode.id ? 'var(--brand-dim)' : 'var(--bg-surface)',
                                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 4, transition: 'all 150ms ease',
                              }}
                            >
                              <span style={{ fontSize: 16 }}>{mode.icon}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{mode.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <SectionLabel>Skin Tone</SectionLabel>
                        <SwatchRow colors={SKIN_TONES} selected={skinTone} onSelect={setSkinTone} size={28} />
                      </div>
                      <SliderControl label="Age" value={age} min={18} max={80} onChange={setAge} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Build</SectionLabel>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {BUILD_OPTIONS.map(b => (
                            <button key={b} onClick={() => setBuild(b)} style={{
                              padding: '5px 10px', fontSize: 11, borderRadius: 'var(--radius-md)',
                              border: build === b ? '1px solid var(--brand)' : '1px solid var(--border)',
                              background: build === b ? 'var(--brand-dim)' : 'transparent',
                              color: build === b ? 'var(--brand-light)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}>{b}</button>
                          ))}
                        </div>
                      </div>
                      <SliderControl label="Height" value={height} min={140} max={210} onChange={setHeight} unit="cm" />
                      <SliderControl label="Gender Presentation" value={genderSlider} min={0} max={100} onChange={setGenderSlider} />

                      {/* Advanced facial features */}
                      <button
                        onClick={() => setShowAdvancedFace(!showAdvancedFace)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                          border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, padding: 0,
                        }}
                      >
                        {showAdvancedFace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Advanced Facial Features
                      </button>
                      {showAdvancedFace && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                          <SliderControl label="Jaw Width" value={jawWidth} min={0} max={100} onChange={setJawWidth} />
                          <SliderControl label="Cheek Height" value={cheekHeight} min={0} max={100} onChange={setCheekHeight} />
                          <SliderControl label="Nose Width" value={noseWidth} min={0} max={100} onChange={setNoseWidth} />
                          <SliderControl label="Eye Size" value={eyeSize} min={0} max={100} onChange={setEyeSize} />
                          <SliderControl label="Lip Fullness" value={lipFullness} min={0} max={100} onChange={setLipFullness} />
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Hair ── */}
                  {editTab === 'hair' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <SectionLabel>Style</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                          {HAIR_STYLES.map(s => (
                            <button key={s} onClick={() => setHairStyle(s)} style={{
                              padding: '8px 6px', fontSize: 11, borderRadius: 'var(--radius-md)',
                              border: hairStyle === s ? '1px solid var(--brand)' : '1px solid var(--border)',
                              background: hairStyle === s ? 'var(--brand-dim)' : 'var(--bg-surface)',
                              color: hairStyle === s ? 'var(--brand-light)' : 'var(--text-secondary)',
                              cursor: 'pointer', textAlign: 'center',
                            }}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Natural Colors</SectionLabel>
                        <SwatchRow colors={HAIR_COLORS} selected={hairColor} onSelect={setHairColor} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Fashion Colors</SectionLabel>
                        <SwatchRow colors={FASHION_HAIR_COLORS} selected={hairColor} onSelect={setHairColor} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SectionLabel>Custom</SectionLabel>
                        <input
                          type="color" value={hairColor} onChange={e => setHairColor(e.target.value)}
                          style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Texture</SectionLabel>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {HAIR_TEXTURES.map(t => (
                            <button key={t} onClick={() => setHairTexture(t)} style={{
                              padding: '5px 10px', fontSize: 11, borderRadius: 'var(--radius-md)',
                              border: hairTexture === t ? '1px solid var(--brand)' : '1px solid var(--border)',
                              background: hairTexture === t ? 'var(--brand-dim)' : 'transparent',
                              color: hairTexture === t ? 'var(--brand-light)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <SliderControl label="Length" value={hairLength} min={0} max={100} onChange={setHairLength} />
                      <SliderControl label="Volume" value={hairVolume} min={0} max={100} onChange={setHairVolume} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={facialHair} onChange={e => setFacialHair(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Facial Hair</span>
                      </label>
                    </>
                  )}

                  {/* ── Wardrobe ── */}
                  {editTab === 'wardrobe' && (
                    <>
                      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        {(['top', 'bottom', 'outerwear', 'shoes', 'accessories'] as WardrobeCategory[]).map(cat => (
                          <button key={cat} onClick={() => setWardrobeCategory(cat)} style={{
                            padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 'var(--radius-md)',
                            border: wardrobeCategory === cat ? '1px solid var(--brand)' : '1px solid var(--border)',
                            background: wardrobeCategory === cat ? 'var(--brand-dim)' : 'transparent',
                            color: wardrobeCategory === cat ? 'var(--brand-light)' : 'var(--text-secondary)',
                            cursor: 'pointer', textTransform: 'capitalize',
                          }}>{cat}</button>
                        ))}
                      </div>
                      {/* Item grid placeholder */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} style={{
                            height: 70, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer',
                          }}>
                            <Shirt size={18} style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <SectionLabel>Fabric</SectionLabel>
                          <select value={fabricType} onChange={e => setFabricType(e.target.value)} style={{
                            padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)', background: 'var(--bg-surface)',
                            color: 'var(--text-primary)', outline: 'none',
                          }}>
                            {['Cotton', 'Silk', 'Denim', 'Leather', 'Wool', 'Synthetic'].map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <SectionLabel>Pattern</SectionLabel>
                          <select value={patternType} onChange={e => setPatternType(e.target.value)} style={{
                            padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)', background: 'var(--bg-surface)',
                            color: 'var(--text-primary)', outline: 'none',
                          }}>
                            {['Solid', 'Striped', 'Plaid', 'Floral', 'Camo', 'Polka Dot'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SectionLabel>Color</SectionLabel>
                        <input type="color" value={outfitColor} onChange={e => setOutfitColor(e.target.value)}
                          style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn small><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Save size={12} /> Save Outfit</span></Btn>
                        <Btn small><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FolderOpen size={12} /> Load Outfit</span></Btn>
                      </div>
                    </>
                  )}

                  {/* ── Expression ── */}
                  {editTab === 'expression' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {EMOTIONS.map(em => (
                          <button key={em.id} onClick={() => setSelectedEmotion(em.id)} style={{
                            padding: '12px 8px', borderRadius: 'var(--radius-md)',
                            border: selectedEmotion === em.id ? '2px solid var(--brand-light)' : '1px solid var(--border)',
                            background: selectedEmotion === em.id ? 'var(--brand-dim)' : 'var(--bg-surface)',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 6, transition: 'all 150ms',
                          }}>
                            <span style={{ fontSize: 24 }}>{em.emoji}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{em.label}</span>
                          </button>
                        ))}
                      </div>
                      <SliderControl label="Intensity" value={emotionIntensity} min={0} max={100} onChange={setEmotionIntensity} unit="%" />

                      <button
                        onClick={() => setShowFACS(!showFACS)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                          border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, padding: 0,
                        }}
                      >
                        {showFACS ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        FACS Action Units
                      </button>
                      {showFACS && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                          {FACS_UNITS.map(unit => (
                            <SliderControl
                              key={unit} label={unit}
                              value={facsValues[unit] ?? 0} min={0} max={100}
                              onChange={v => setFacsValues(prev => ({ ...prev, [unit]: v }))}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Animation ── */}
                  {editTab === 'animation' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Idle Style</SectionLabel>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {IDLE_STYLES.map(s => (
                            <button key={s} onClick={() => setIdleStyle(s)} style={{
                              padding: '6px 14px', fontSize: 11, borderRadius: 'var(--radius-md)',
                              border: idleStyle === s ? '1px solid var(--brand)' : '1px solid var(--border)',
                              background: idleStyle === s ? 'var(--brand-dim)' : 'transparent',
                              color: idleStyle === s ? 'var(--brand-light)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}>{s}</button>
                          ))}
                        </div>
                      </div>

                      {/* Toggle + slider combos */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={breathingEnabled} onChange={e => setBreathingEnabled(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Breathing</span>
                          </label>
                          {breathingEnabled && (
                            <SliderControl label="Intensity" value={breathingIntensity} min={0} max={100} onChange={setBreathingIntensity} />
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={swayEnabled} onChange={e => setSwayEnabled(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Body Sway</span>
                          </label>
                          {swayEnabled && (
                            <SliderControl label="Intensity" value={swayIntensity} min={0} max={100} onChange={setSwayIntensity} />
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={eyeMovement} onChange={e => setEyeMovement(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Eye Movement</span>
                          </label>
                          {eyeMovement && (
                            <SliderControl label="Frequency" value={eyeFrequency} min={0} max={100} onChange={setEyeFrequency} />
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <SectionLabel>Motion Presets</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                          {MOTION_PRESETS.map(p => (
                            <button key={p} onClick={() => setSelectedPreset(p)} style={{
                              padding: '8px 6px', fontSize: 11, borderRadius: 'var(--radius-md)',
                              border: selectedPreset === p ? '1px solid var(--brand)' : '1px solid var(--border)',
                              background: selectedPreset === p ? 'var(--brand-dim)' : 'var(--bg-surface)',
                              color: selectedPreset === p ? 'var(--brand-light)' : 'var(--text-secondary)',
                              cursor: 'pointer', textAlign: 'center',
                            }}>{p}</button>
                          ))}
                        </div>
                      </div>

                      <SliderControl label="Animation Speed" value={animationSpeed} min={0} max={100} onChange={setAnimationSpeed} unit="%" />

                      {/* Continue to voice */}
                      <Btn primary onClick={() => setCurrentStepIndex(6)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Continue to Voice <ChevronRight size={14} />
                        </span>
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── VOICE STEP ── */}
            {currentStep?.id === 'voice' && (
              <div style={{
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mic size={18} style={{ color: 'var(--brand-light)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Voice Pairing</span>
                </div>

                {/* Existing voices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SectionLabel>Select Existing Voice</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {VOICE_PRESETS.map(v => (
                      <button key={v.id} onClick={() => { setSelectedVoice(v.id); setVoiceUpload(false); }} style={{
                        padding: '10px 14px', borderRadius: 'var(--radius-md)',
                        border: selectedVoice === v.id ? '2px solid var(--brand)' : '1px solid var(--border)',
                        background: selectedVoice === v.id ? 'var(--brand-dim)' : 'var(--bg-surface)',
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 150ms',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{v.desc}</span>
                        </div>
                        <Volume2 size={14} style={{ color: selectedVoice === v.id ? 'var(--brand-light)' : 'var(--text-tertiary)' }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload voice sample */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <button
                  onClick={() => { setVoiceUpload(true); setSelectedVoice(null); }}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius-md)',
                    border: voiceUpload ? '2px solid var(--brand)' : '2px dashed var(--border)',
                    background: voiceUpload ? 'var(--brand-dim)' : 'var(--bg-surface)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <CloudUpload size={16} style={{ color: voiceUpload ? 'var(--brand-light)' : 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 12, color: voiceUpload ? 'var(--brand-light)' : 'var(--text-secondary)' }}>
                    Upload Voice Sample
                  </span>
                </button>

                {/* Voice name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SectionLabel>Voice Name</SectionLabel>
                  <input
                    type="text" value={voiceName} onChange={e => setVoiceName(e.target.value)}
                    placeholder="e.g. My Voice Clone"
                    style={{
                      padding: '8px 12px', fontSize: 13, borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'var(--bg-surface)',
                      color: 'var(--text-primary)', outline: 'none',
                    }}
                  />
                </div>

                {/* V+A identity lock */}
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(124, 58, 237, 0.08)', border: '1px solid var(--brand-border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Lock size={14} style={{ color: 'var(--brand-light)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Voice + Avatar identity lock: Once paired, this voice will be cryptographically linked to this avatar for content provenance.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Btn primary disabled={!selectedVoice && !voiceUpload} onClick={() => setCurrentStepIndex(7)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lock size={12} /> Pair Voice & Continue
                    </span>
                  </Btn>
                  <button
                    onClick={() => setCurrentStepIndex(7)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-tertiary)',
                      fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* ── EXPORT STEP ── */}
            {currentStep?.id === 'export' && (
              <div style={{
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} style={{ color: 'var(--brand-light)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Export Formats</span>
                </div>

                {/* Format cards 2x3 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {EXPORT_FORMATS.map(fmt => {
                    const isSelected = selectedFormats.has(fmt.id);
                    return (
                      <div
                        key={fmt.id}
                        style={{
                          padding: '14px 12px', borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--brand)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                          display: 'flex', flexDirection: 'column', gap: 6,
                          alignItems: 'flex-start', transition: 'all 150ms',
                        }}
                      >
                        <div
                          onClick={() => {
                            setSelectedFormats(prev => {
                              const next = new Set(prev);
                              if (next.has(fmt.id)) next.delete(fmt.id);
                              else next.add(fmt.id);
                              return next;
                            });
                          }}
                          style={{ cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt.label}</span>
                            {isSelected && <CheckCircle2 size={14} style={{ color: 'var(--brand-light)' }} />}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmt.desc}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{fmt.ext}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (downloadingFormats.has(fmt.id)) return;
                            setDownloadingFormats(prev => { const n = new Set(prev); n.add(fmt.id); return n; });
                            setTimeout(() => {
                              setDownloadingFormats(prev => { const n = new Set(prev); n.delete(fmt.id); return n; });
                            }, 2000);
                          }}
                          disabled={downloadingFormats.has(fmt.id)}
                          style={{
                            marginTop: 2, padding: '5px 10px', fontSize: 10, fontWeight: 600,
                            borderRadius: 'var(--radius-md)', border: 'none',
                            background: downloadingFormats.has(fmt.id) ? '#374151' : 'var(--brand)',
                            color: '#fff', cursor: downloadingFormats.has(fmt.id) ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                            justifyContent: 'center', transition: 'all 150ms ease',
                          }}
                        >
                          {downloadingFormats.has(fmt.id) ? (
                            <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                          ) : (
                            <><Download size={10} /> Download</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* MP4 options (show when MP4 selected) */}
                {selectedFormats.has('mp4') && (
                  <div style={{
                    padding: 14, borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>MP4 Options</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <SectionLabel>Resolution</SectionLabel>
                        <select value={mp4Resolution} onChange={e => setMp4Resolution(e.target.value)} style={{
                          padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)', outline: 'none',
                        }}>
                          {MP4_RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <SectionLabel>Duration</SectionLabel>
                        <select value={mp4Duration} onChange={e => setMp4Duration(e.target.value)} style={{
                          padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)', outline: 'none',
                        }}>
                          {MP4_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <SectionLabel>Background</SectionLabel>
                        <select value={mp4Background} onChange={e => setMp4Background(e.target.value)} style={{
                          padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)', outline: 'none',
                        }}>
                          {MP4_BACKGROUNDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={selectedFormats.size === 0 || downloadingAll}
                  onClick={() => {
                    if (downloadingAll || selectedFormats.size === 0) return;
                    setDownloadingAll(true);
                    setTimeout(() => setDownloadingAll(false), 2000);
                  }}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    borderRadius: 'var(--radius-md)', border: 'none',
                    background: (selectedFormats.size === 0 || downloadingAll) ? '#374151' : 'var(--brand)',
                    color: '#fff',
                    cursor: (selectedFormats.size === 0 || downloadingAll) ? 'not-allowed' : 'pointer',
                    opacity: selectedFormats.size === 0 ? 0.45 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', transition: 'all 150ms ease',
                  }}
                >
                  {downloadingAll ? (
                    <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Preparing ZIP...</>
                  ) : (
                    <><Package size={14} /> Download All ZIP</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ═══ PROPERTIES PANEL (RIGHT 280px) ═══ */}
          <div style={{
            width: 280, flexShrink: 0, background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-xl)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Properties
            </h2>

            {/* Editable name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SectionLabel>Name</SectionLabel>
              <input
                type="text" value={avatarName || 'Untitled Avatar'} onChange={e => setAvatarName(e.target.value)}
                style={{
                  padding: '6px 8px', fontSize: 12, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', outline: 'none', fontWeight: 500,
                }}
              />
            </div>

            {/* Style dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SectionLabel>Style</SectionLabel>
              <select
                value={styleMode} onChange={e => setStyleMode(e.target.value as StyleMode)}
                style={{
                  padding: '6px 8px', fontSize: 12, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              >
                {STYLE_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            {/* Consent */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SectionLabel>Consent</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: consentChecked ? '#22c55e' : '#ef4444',
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {consentChecked ? 'Verified' : 'Not confirmed'}
                </span>
              </div>
            </div>

            {/* Quality gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
              <QualityGauge
                score={qualityScore}
                status={editingUnlocked ? 'complete' : isProcessing ? 'processing' : 'idle'}
              />
            </div>

            {/* Pipeline progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SectionLabel>Pipeline</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {PIPELINE_STEPS.map((step, i) => {
                  const status = getStepStatus(i, currentStepIndex);
                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {status === 'completed' ? (
                        <CheckCircle2 size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                      ) : status === 'current' ? (
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%', border: '2px solid #eab308',
                          animation: 'pulse 2s ease-in-out infinite', flexShrink: 0,
                        }} />
                      ) : (
                        <Circle size={12} style={{ color: '#4b5563', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 10,
                        color: status === 'completed' ? '#22c55e' : status === 'current' ? '#eab308' : 'var(--text-tertiary)',
                        fontWeight: status === 'current' ? 600 : 400,
                      }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <SectionLabel>Actions</SectionLabel>
              <button style={{
                padding: '7px 10px', fontSize: 11, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', textAlign: 'left',
              }}>
                <RotateCcw size={12} /> Regenerate Texture
              </button>
              <button style={{
                padding: '7px 10px', fontSize: 11, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', textAlign: 'left',
              }}>
                <Layers size={12} /> Re-rig
              </button>
              <button style={{
                padding: '7px 10px', fontSize: 11, borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', textAlign: 'left',
              }}>
                <Trash2 size={12} /> Delete Avatar
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RECENT AVATARS ═══ */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            Recent Avatars
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {SAMPLE_AVATARS.map(avatar => (
              <div
                key={avatar.id}
                className="avatar-card"
                onClick={() => {
                  setAvatarName(avatar.name);
                  setStyleMode(STYLE_MODES.find(m => m.label === avatar.style)?.id ?? 'realistic');
                  setConsentChecked(true);
                  if (avatar.status === 'complete') {
                    setCurrentStepIndex(7);
                    setPipelineComplete(true);
                  } else {
                    setCurrentStepIndex(0);
                    setPipelineComplete(false);
                  }
                }}
                style={{
                  background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                  cursor: 'pointer', transition: 'border-color 150ms ease', position: 'relative',
                }}
              >
                <div style={{
                  height: 80, background: avatar.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  {avatar.thumbnailUrl ? (
                    <img src={avatar.thumbnailUrl} alt={avatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={28} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  )}

                  {/* Hover actions overlay */}
                  <div className="avatar-hover-actions" style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: 0, transition: 'opacity 200ms ease',
                  }}>
                    <button title="Edit" style={{
                      width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}><Edit3 size={13} /></button>
                    <button title="Use in Project" style={{
                      width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}><FolderOpen size={13} /></button>
                    <button title="Export" style={{
                      width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}><Download size={13} /></button>
                    <button title="More" style={{
                      width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}><MoreHorizontal size={13} /></button>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px 12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {avatar.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{avatar.style}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 500,
                    color: avatar.status === 'complete' ? '#22c55e' : '#eab308',
                    background: avatar.status === 'complete' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                    padding: '2px 8px', borderRadius: 'var(--radius-md)',
                  }}>
                    {avatar.status === 'complete' ? 'Complete' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Keyframe animations + hover styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
          50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(234, 179, 8, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .avatar-card:hover {
          border-color: var(--border-strong) !important;
        }
        .avatar-card:hover .avatar-hover-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
