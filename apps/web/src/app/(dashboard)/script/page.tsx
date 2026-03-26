'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Clock,
  Save,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Camera,
  Users,
  Check,
  Link,
  UserPlus,
  GripVertical,
  Timer,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  SceneBlock,
  DialogueLine,
  ShotBreakdown,
  DetectedCharacter,
} from '@/lib/types';

/* ── Constants ──────────────────────────────────────────────── */

const FORMATS = ['Short Film', 'Ad 30s', 'Explainer', 'Music Video', 'Documentary'] as const;
const TONES = ['Action', 'Drama', 'Comedy', 'Horror', 'Mystery', 'Fantasy'] as const;
const ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;
const CAMERA_TYPES = [
  'Wide', 'Medium', 'Close-up', 'Extreme Close-up', 'Over-the-shoulder',
  'POV', 'Aerial', 'Tracking', 'Dutch Angle', 'Insert',
] as const;

const MOCK_PROJECTS = [
  { id: 'proj-1', title: 'Neo-Tokyo Cyberpunk' },
  { id: 'proj-2', title: 'Nature Documentary S2' },
  { id: 'proj-3', title: 'Brand Ad - Summer Campaign' },
];

/* ── Mock Data ──────────────────────────────────────────────── */

const INITIAL_SCENES: SceneBlock[] = [
  {
    id: 'scene-1',
    sceneNumber: 1,
    heading: 'SCENE 1 - EXT. NEO-TOKYO ROOFTOP - NIGHT',
    action:
      'Kai stands on the edge of a rain-soaked rooftop, neon lights reflecting off his cybernetic arm. The city hums below — a maze of holographic billboards and speeding drones. He clenches his fist, circuits flickering beneath synthetic skin.',
    dialogue: [
      { characterName: 'KAI', parenthetical: 'quietly', line: 'They said the signal would be stronger up here.' },
    ],
  },
  {
    id: 'scene-2',
    sceneNumber: 2,
    heading: 'SCENE 2 - INT. UNDERGROUND LAB - NIGHT',
    action:
      'Dr. Echo adjusts holographic displays, her fingers dancing through projected data streams. Vials of luminescent fluid line the walls. A warning klaxon pulses red as anomalous readings spike across every monitor.',
    dialogue: [
      { characterName: 'DR. ECHO', line: 'The containment field is destabilizing. We have minutes, not hours.' },
    ],
  },
  {
    id: 'scene-3',
    sceneNumber: 3,
    heading: 'SCENE 3 - EXT. GARDEN RUINS - DAWN',
    action:
      'Luna kneels beside a withered flower, channeling energy from her palms. Golden light seeps into cracked earth. Petals unfurl in slow motion as the first rays of sunrise break through crumbling stone arches.',
    dialogue: [],
  },
];

const INITIAL_SHOTS: ShotBreakdown[] = [
  { id: 'shot-1', shotNumber: 1, cameraType: 'Wide', description: 'Establishing — rooftop skyline with neon city below', durationSeconds: 4, characterIds: ['char-kai'], sceneId: 'scene-1' },
  { id: 'shot-2', shotNumber: 2, cameraType: 'Close-up', description: 'Cybernetic arm flickering with circuit patterns', durationSeconds: 2, characterIds: ['char-kai'], sceneId: 'scene-1' },
  { id: 'shot-3', shotNumber: 3, cameraType: 'Medium', description: 'Kai clenching fist, rain on face', durationSeconds: 3, characterIds: ['char-kai'], sceneId: 'scene-1' },
  { id: 'shot-4', shotNumber: 4, cameraType: 'Wide', description: 'Underground lab interior, holographic displays active', durationSeconds: 4, characterIds: ['char-echo'], sceneId: 'scene-2' },
  { id: 'shot-5', shotNumber: 5, cameraType: 'Insert', description: 'Holographic data streams and anomaly readings', durationSeconds: 2, sceneId: 'scene-2' },
  { id: 'shot-6', shotNumber: 6, cameraType: 'Medium', description: 'Dr. Echo at console, klaxon pulsing red', durationSeconds: 3, characterIds: ['char-echo'], sceneId: 'scene-2' },
  { id: 'shot-7', shotNumber: 7, cameraType: 'Wide', description: 'Garden ruins at dawn, mist rising', durationSeconds: 5, characterIds: ['char-luna'], sceneId: 'scene-3' },
  { id: 'shot-8', shotNumber: 8, cameraType: 'Close-up', description: 'Energy flowing from palms into cracked earth', durationSeconds: 3, characterIds: ['char-luna'], sceneId: 'scene-3' },
  { id: 'shot-9', shotNumber: 9, cameraType: 'Tracking', description: 'Slow-mo petals unfurling in golden light', durationSeconds: 4, characterIds: ['char-luna'], sceneId: 'scene-3' },
];

const INITIAL_CHARACTERS: DetectedCharacter[] = [
  { name: 'Kai', characterId: 'char-kai', occurrences: 3 },
  { name: 'Dr. Echo', occurrences: 2 },
  { name: 'Luna', occurrences: 2 },
];

/* ── Helpers ────────────────────────────────────────────────── */

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Page Component ─────────────────────────────────────────── */

export default function ScriptPage() {
  /* Top bar state */
  const [scriptTitle, setScriptTitle] = useState('Untitled Script');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedProject, setSelectedProject] = useState(MOCK_PROJECTS[0].id);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  /* Generation controls state */
  const [format, setFormat] = useState<string>(FORMATS[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [targetDuration, setTargetDuration] = useState(60);
  const [targetShotCount, setTargetShotCount] = useState(9);
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  /* Script output state */
  const [scenes, setScenes] = useState<SceneBlock[]>(INITIAL_SCENES);
  const [shots, setShots] = useState<ShotBreakdown[]>(INITIAL_SHOTS);
  const [detectedCharacters, setDetectedCharacters] = useState<DetectedCharacter[]>(INITIAL_CHARACTERS);
  const [saved, setSaved] = useState(true);
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);

  /* Shot panel state */
  const [expandedShot, setExpandedShot] = useState<string | null>(null);

  /* Auto-save indicator */
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const markDirty = useCallback(() => {
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaved(true), 1500);
  }, []);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = () => {
      setShowProjectDropdown(false);
      setShowExportDropdown(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  /* Focus title input when editing */
  useEffect(() => {
    if (isEditingTitle && titleRef.current) titleRef.current.focus();
  }, [isEditingTitle]);

  /* ── Scene handlers ───────────────────────────────────────── */

  const updateScene = (id: string, patch: Partial<SceneBlock>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    markDirty();
  };

  const moveScene = (id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    });
    markDirty();
  };

  const addSceneAfter = (id: string) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const newScene: SceneBlock = {
        id: uid(),
        sceneNumber: idx + 2,
        heading: `SCENE ${idx + 2} - INT/EXT. LOCATION - TIME`,
        action: '',
        dialogue: [],
      };
      const next = [...prev.slice(0, idx + 1), newScene, ...prev.slice(idx + 1)];
      return next.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    });
    markDirty();
  };

  const deleteScene = (id: string) => {
    if (scenes.length <= 1) {
      toast.error('Cannot delete the last scene');
      return;
    }
    setScenes((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, sceneNumber: i + 1 }))
    );
    setShots((prev) => prev.filter((sh) => sh.sceneId !== id));
    markDirty();
    toast.success('Scene deleted');
  };

  const addDialogue = (sceneId: string) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId
          ? { ...s, dialogue: [...(s.dialogue || []), { characterName: 'CHARACTER', line: '' }] }
          : s
      )
    );
    markDirty();
  };

  const updateDialogue = (sceneId: string, dIdx: number, patch: Partial<DialogueLine>) => {
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id !== sceneId) return s;
        const dialogue = [...(s.dialogue || [])];
        dialogue[dIdx] = { ...dialogue[dIdx], ...patch };
        return { ...s, dialogue };
      })
    );
    markDirty();
  };

  /* ── Shot handlers ────────────────────────────────────────── */

  const updateShot = (id: string, patch: Partial<ShotBreakdown>) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    markDirty();
  };

  const totalDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);

  /* ── Generation mock ──────────────────────────────────────── */

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }
    setIsGenerating(true);
    toast.loading('Generating script...', { id: 'gen' });
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Script generated successfully', { id: 'gen' });
      markDirty();
    }, 2000);
  };

  /* ── Export handler ───────────────────────────────────────── */

  const handleExport = (fmt: string) => {
    toast.success(`Exporting as ${fmt}...`);
    setShowExportDropdown(false);
  };

  const handleSave = () => {
    toast.success('Script saved');
    setSaved(true);
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>

      {/* ════════════════════════════════════════════════════════
          TOP BAR
         ════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
      >
        {/* Left side: icon + editable title + project selector */}
        <div className="flex items-center gap-3">
          <FileText size={18} style={{ color: 'var(--brand-light)' }} />

          {/* Editable title */}
          {isEditingTitle ? (
            <input
              ref={titleRef}
              value={scriptTitle}
              onChange={(e) => setScriptTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              className="rounded border px-2 py-0.5 text-sm font-semibold outline-none"
              style={{
                borderColor: 'var(--brand)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                minWidth: 180,
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
              title="Click to edit title"
            >
              {scriptTitle}
            </button>
          )}

          {/* Divider */}
          <span className="mx-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>|</span>

          {/* Project selector */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowProjectDropdown((p) => !p); setShowExportDropdown(false); }}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
              }}
            >
              {MOCK_PROJECTS.find((p) => p.id === selectedProject)?.title}
              <ChevronDown size={12} />
            </button>
            {showProjectDropdown && (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border py-1 shadow-lg"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {MOCK_PROJECTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProject(p.id); setShowProjectDropdown(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                    style={{
                      color: p.id === selectedProject ? 'var(--brand-light)' : 'var(--text-primary)',
                      backgroundColor: p.id === selectedProject ? 'var(--brand-dim)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (p.id !== selectedProject) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (p.id !== selectedProject) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {p.id === selectedProject && <Check size={12} />}
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-save indicator */}
          <span className="ml-2 flex items-center gap-1 text-[11px]" style={{ color: saved ? 'var(--success, #4ade80)' : 'var(--text-tertiary)' }}>
            {saved ? <><Check size={11} /> Saved</> : 'Unsaved changes...'}
          </span>
        </div>

        {/* Right side: Export, Save, History */}
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportDropdown((p) => !p); setShowProjectDropdown(false); }}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
            >
              Export
              <ChevronDown size={12} />
            </button>
            {showExportDropdown && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border py-1 shadow-lg"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {['PDF', 'Fountain', 'Final Draft'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="flex w-full px-3 py-2 text-left text-xs transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <Save size={13} />
            Save
          </button>

          {/* History */}
          <button
            onClick={() => toast.info('Version history coming soon')}
            className="flex items-center justify-center rounded-md border p-1.5 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Version history"
          >
            <Clock size={14} />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          GENERATION CONTROLS
         ════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 border-b px-5 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Row 1: Format + Tone */}
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Duration slider + Shot count slider + Aspect ratio toggle */}
        <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Target Duration: <span style={{ color: 'var(--brand-light)' }}>{targetDuration}s</span>
            </label>
            <input
              type="range"
              min={15}
              max={300}
              step={5}
              value={targetDuration}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
              className="w-full accent-[var(--brand)]"
              style={{ accentColor: 'var(--brand)' }}
            />
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>15s</span><span>300s</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Target Shots: <span style={{ color: 'var(--brand-light)' }}>{targetShotCount}</span>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={targetShotCount}
              onChange={(e) => setTargetShotCount(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--brand)' }}
            />
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>3</span><span>30</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Aspect Ratio
            </label>
            <div
              className="flex overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--border)' }}
            >
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  className="px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: aspectRatio === ar ? 'var(--brand)' : 'var(--bg-elevated)',
                    color: aspectRatio === ar ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Prompt textarea + char counter */}
        <div className="mb-3 flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Prompt
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setPrompt(e.target.value);
              }}
              placeholder="Describe the story, mood, setting, and key moments for your script..."
              rows={4}
              className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <span
              className="absolute bottom-2 right-3 text-[11px]"
              style={{ color: prompt.length >= 950 ? 'var(--error, #f87171)' : 'var(--text-tertiary)' }}
            >
              {prompt.length}/1000
            </span>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <Sparkles size={15} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'Generating...' : 'Generate Script'}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT: Script (left) + Shots (right)
         ════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel: Script Scenes + Character Detection ─── */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Script Scenes
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand-light)' }}
            >
              <Sparkles size={11} />
              Powered by Claude
            </span>
          </div>

          {/* Scene cards */}
          <div className="flex flex-col gap-3">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="group relative rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: hoveredScene === scene.id ? 'var(--brand)' : 'var(--border)',
                }}
                onMouseEnter={() => setHoveredScene(scene.id)}
                onMouseLeave={() => setHoveredScene(null)}
              >
                {/* Scene toolbar — visible on hover */}
                <div
                  className="absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm transition-opacity"
                  style={{
                    opacity: hoveredScene === scene.id ? 1 : 0,
                    pointerEvents: hoveredScene === scene.id ? 'auto' : 'none',
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <button onClick={() => moveScene(scene.id, -1)} className="rounded p-1 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Move up"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => moveScene(scene.id, 1)} className="rounded p-1 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Move down"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button onClick={() => addSceneAfter(scene.id)} className="rounded p-1 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Add scene after"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Plus size={13} />
                  </button>
                  <button onClick={() => deleteScene(scene.id)} className="rounded p-1 transition-colors" style={{ color: 'var(--error, #f87171)' }} title="Delete scene"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="p-4">
                  {/* Editable heading */}
                  <input
                    value={scene.heading}
                    onChange={(e) => updateScene(scene.id, { heading: e.target.value })}
                    className="mb-2 w-full bg-transparent text-xs font-semibold uppercase tracking-wide outline-none"
                    style={{ color: 'var(--text-brand)' }}
                  />

                  {/* Editable action text */}
                  <textarea
                    value={scene.action}
                    onChange={(e) => updateScene(scene.id, { action: e.target.value })}
                    rows={3}
                    className="mb-2 w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                    style={{ color: 'var(--text-secondary)' }}
                    placeholder="Scene action description..."
                  />

                  {/* Dialogue lines */}
                  {scene.dialogue && scene.dialogue.length > 0 && (
                    <div className="mb-2 flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                      {scene.dialogue.map((d, dIdx) => (
                        <div key={dIdx} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              value={d.characterName}
                              onChange={(e) => updateDialogue(scene.id, dIdx, { characterName: e.target.value })}
                              className="w-32 bg-transparent text-xs font-bold uppercase outline-none"
                              style={{ color: 'var(--brand-light)' }}
                            />
                            {d.parenthetical && (
                              <span className="text-[11px] italic" style={{ color: 'var(--text-tertiary)' }}>
                                ({d.parenthetical})
                              </span>
                            )}
                          </div>
                          <input
                            value={d.line}
                            onChange={(e) => updateDialogue(scene.id, dIdx, { line: e.target.value })}
                            className="w-full bg-transparent text-sm outline-none"
                            style={{ color: 'var(--text-primary)' }}
                            placeholder="Dialogue line..."
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add dialogue button */}
                  <button
                    onClick={() => addDialogue(scene.id)}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                    style={{ color: 'var(--brand-light)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-dim)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Plus size={11} />
                    Add Dialogue
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Character Detection Section ────────────────────── */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Users size={15} style={{ color: 'var(--brand-light)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Detected Characters
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {detectedCharacters.map((char) => (
                <div
                  key={char.name}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand-light)' }}
                    >
                      {char.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {char.name}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {char.occurrences} occurrence{char.occurrences !== 1 ? 's' : ''} in script
                      </p>
                    </div>
                  </div>
                  <div>
                    {char.characterId ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}
                      >
                        <Check size={11} />
                        Matched
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toast.info(`Link ${char.name} to existing character`)}
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Link size={10} />
                          Link
                        </button>
                        <button
                          onClick={() => {
                            setDetectedCharacters((prev) =>
                              prev.map((c) => c.name === char.name ? { ...c, characterId: uid() } : c)
                            );
                            toast.success(`Created character: ${char.name}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--brand)' }}
                        >
                          <UserPlus size={10} />
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Shot Breakdown (280px) ─────────────── */}
        <aside
          className="flex w-[280px] shrink-0 flex-col border-l overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-2">
              <Camera size={14} style={{ color: 'var(--brand-light)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Shot Breakdown
              </h3>
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {shots.length} shots
            </span>
          </div>

          {/* Shot list */}
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
            {shots.map((shot) => {
              const isExpanded = expandedShot === shot.id;
              return (
                <div
                  key={shot.id}
                  className="rounded-md border transition-colors"
                  style={{
                    borderColor: isExpanded ? 'var(--brand)' : 'var(--border)',
                    backgroundColor: isExpanded ? 'var(--bg-surface)' : 'transparent',
                  }}
                >
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedShot(isExpanded ? null : shot.id)}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand-light)' }}
                    >
                      {shot.shotNumber}
                    </span>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-[11px] leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {shot.description}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {shot.cameraType} &middot; {shot.durationSeconds}s
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="flex flex-col gap-2 border-t px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                      {/* Camera type */}
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Camera</label>
                        <select
                          value={shot.cameraType}
                          onChange={(e) => updateShot(shot.id, { cameraType: e.target.value })}
                          className="rounded border px-2 py-1 text-[11px] outline-none"
                          style={{
                            borderColor: 'var(--border)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {CAMERA_TYPES.map((ct) => (
                            <option key={ct} value={ct}>{ct}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Duration (s)</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={shot.durationSeconds}
                          onChange={(e) => updateShot(shot.id, { durationSeconds: Math.max(1, Number(e.target.value)) })}
                          className="rounded border px-2 py-1 text-[11px] outline-none"
                          style={{
                            borderColor: 'var(--border)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            width: 70,
                          }}
                        />
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Description</label>
                        <textarea
                          value={shot.description}
                          onChange={(e) => updateShot(shot.id, { description: e.target.value })}
                          rows={2}
                          className="resize-none rounded border px-2 py-1 text-[11px] outline-none"
                          style={{
                            borderColor: 'var(--border)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>

                      {/* Character chips */}
                      {shot.characterIds && shot.characterIds.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Characters</label>
                          <div className="flex flex-wrap gap-1">
                            {shot.characterIds.map((cId) => {
                              const charName = detectedCharacters.find((c) => c.characterId === cId)?.name || cId;
                              return (
                                <span
                                  key={cId}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand-light)' }}
                                >
                                  {charName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: total duration + push to timeline */}
          <div className="flex flex-col gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <div
              className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
            >
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Timer size={12} />
                Total duration
              </span>
              <span className="font-semibold" style={{ color: 'var(--text-brand)' }}>
                {totalDuration}s
              </span>
            </div>
            <button
              onClick={() => toast.success('All shots pushed to timeline')}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <Play size={12} />
              Push All to Timeline
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
