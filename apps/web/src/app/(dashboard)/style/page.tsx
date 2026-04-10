'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Palette,
  Download,
  Check,
  Upload,
  Search,
  Sparkles,
  Eye,
  Info,
  SlidersHorizontal,
  Image,
  ArrowRight,
  Plus,
  Star,
  Filter,
  ChevronDown,
  Loader,
  X,
  GripVertical,
  Bookmark,
  Copy,
  Sun,
  Compass,
  Share2,
  Users,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ───────────────────────────────────────────────────── */

const TABS = ['Clone Style', 'Cartoon Pro', 'Style Library', 'Image to Cartoon'] as const;
type Tab = (typeof TABS)[number];

type CloneSubTab = 'upload' | 'discovery';
type CloneStage = 'idle' | 'uploading' | 'analyzing-colors' | 'extracting-motion' | 'building-fingerprint' | 'done';

interface StylePack {
  id: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  downloads: number;
  category: string;
  isUserStyle?: boolean;
}

interface DiscoveryResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}

/* ── Sample Data ─────────────────────────────────────────────── */

const STYLE_PACKS: StylePack[] = [
  { id: 'cyberpunk-neon', title: 'Cyberpunk Neon', description: 'Glowing neon edges, dark backgrounds', gradientFrom: '#0f0a2e', gradientTo: '#1a0a3e', downloads: 12_840, category: 'Digital' },
  { id: 'watercolor-dream', title: 'Watercolor Dream', description: 'Soft watercolor strokes', gradientFrom: '#0a1f0a', gradientTo: '#0d2b0d', downloads: 9_320, category: 'Painterly' },
  { id: 'anime-classic', title: 'Anime Classic', description: 'Clean line art, cel shading', gradientFrom: '#1a0a2e', gradientTo: '#2e0a1a', downloads: 18_560, category: 'Anime' },
  { id: 'film-noir', title: 'Film Noir', description: 'High contrast, dramatic shadows', gradientFrom: '#0a0a0f', gradientTo: '#1a1a1a', downloads: 7_150, category: 'Cinematic' },
  { id: 'pixel-retro', title: 'Pixel Retro', description: '8-bit style, sharp pixels', gradientFrom: '#0a2e0a', gradientTo: '#1a3e1a', downloads: 5_980, category: 'Digital' },
  { id: 'oil-painting', title: 'Oil Painting', description: 'Rich textures, visible brushstrokes', gradientFrom: '#2e1a0a', gradientTo: '#3e2a1a', downloads: 11_200, category: 'Painterly' },
];

const LIBRARY_CATEGORIES = ['All', 'Cinematic', 'Cartoon', 'Anime', 'Painterly', 'Digital'] as const;
const SORT_OPTIONS = ['Most Popular', 'Newest', 'Highest Rated', 'Name A-Z'] as const;

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Summer Campaign' },
  { id: 'p2', name: 'Product Launch Video' },
  { id: 'p3', name: 'Brand Story' },
];

const MOCK_SHOTS = [
  { id: 's1', name: 'Opening Title' },
  { id: 's2', name: 'Hero Shot' },
  { id: 's3', name: 'Interview A' },
  { id: 's4', name: 'B-Roll Montage' },
  { id: 's5', name: 'Closing CTA' },
];

const STYLE_DETAILS: Record<string, { creator: string; rating: number; usedBy: number; palette: string[]; contrast: string; grain: string; camera: string; editRhythm: string }> = {
  'cyberpunk-neon': { creator: 'NeonWorks', rating: 4.8, usedBy: 342, palette: ['#0f0a2e', '#e94560', '#00d4ff', '#7b2ff7', '#ff6b9d'], contrast: 'High', grain: 'None', camera: 'Tracking', editRhythm: '1.8s avg' },
  'watercolor-dream': { creator: 'AquaBrush', rating: 4.5, usedBy: 218, palette: ['#0a1f0a', '#7ec8a0', '#f4d35e', '#ee964b', '#c4a882'], contrast: 'Low', grain: 'Light (15%)', camera: 'Static', editRhythm: '4.2s avg' },
  'anime-classic': { creator: 'TokyoFrame', rating: 4.9, usedBy: 567, palette: ['#1a0a2e', '#ff6b9d', '#00d4ff', '#ffd460', '#ffffff'], contrast: 'Medium', grain: 'None', camera: 'Pan', editRhythm: '2.5s avg' },
  'film-noir': { creator: 'ShadowLens', rating: 4.7, usedBy: 189, palette: ['#0a0a0f', '#1a1a1a', '#333333', '#666666', '#cccccc'], contrast: 'Very High', grain: 'Heavy (60%)', camera: 'Slow Dolly', editRhythm: '3.8s avg' },
  'pixel-retro': { creator: 'Bit8Studio', rating: 4.3, usedBy: 134, palette: ['#0a2e0a', '#00ff00', '#ff0000', '#ffff00', '#0000ff'], contrast: 'High', grain: 'None', camera: 'Fixed', editRhythm: '1.2s avg' },
  'oil-painting': { creator: 'BrushMaster', rating: 4.6, usedBy: 276, palette: ['#2e1a0a', '#c4793a', '#8b4513', '#daa520', '#f5deb3'], contrast: 'Medium', grain: 'Texture (40%)', camera: 'Slow Pan', editRhythm: '5.0s avg' },
};

const CARTOON_STYLES = ['Anime', 'Western Toon', 'Disney', 'Flat Vector', 'Comic Book', 'Chibi', 'Pixel Art', 'Watercolor', '3D Stylized'] as const;

const CARTOON_PRESETS = ['Anime Standard', 'Classic Toon', 'Disney 24', 'Manga BW'] as const;

const SHADING_MODES = ['Cel', 'Gradient', 'Hatching', 'Flat'] as const;
const ANIMATION_STYLES = ['Snappy', 'Smooth', 'Elastic', 'Linear'] as const;
const VISEME_STYLES = ['Anime', 'Western', 'Realistic', 'Simple'] as const;

const MOCK_DISCOVERY_RESULTS: DiscoveryResult[] = [
  { id: 'd1', title: 'Wes Anderson Palette', description: 'Symmetrical, pastel tones, high saturation', thumbnail: '#c4a882' },
  { id: 'd2', title: 'Vintage Film Look', description: 'Warm grain, lifted blacks, faded highlights', thumbnail: '#8b7355' },
  { id: 'd3', title: 'Clean Studio Style', description: 'Crisp colors, even lighting, minimal grain', thumbnail: '#5a7d9a' },
];

const FINGERPRINT_COLORS = ['#1a1a2e', '#e94560', '#0f3460', '#16213e', '#533483', '#ffd460'];

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDownloads(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ── Shared Styles ───────────────────────────────────────────── */

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  padding: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-sunken)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity 0.15s ease',
};

const btnSecondary: React.CSSProperties = {
  background: 'var(--bg-sunken)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity 0.15s ease',
};

const sliderTrack: React.CSSProperties = {
  width: '100%',
  height: 4,
  borderRadius: 2,
  appearance: 'none' as const,
  background: 'var(--bg-sunken)',
  outline: 'none',
  cursor: 'pointer',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-sunken)',
  border: '0.5px solid var(--border)',
  fontSize: 10,
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

/* ── Component ───────────────────────────────────────────────── */

export default function StyleStudioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Clone Style');

  /* Clone Style state */
  const [cloneSubTab, setCloneSubTab] = useState<CloneSubTab>('upload');
  const [cloneStage, setCloneStage] = useState<CloneStage>('idle');
  const [cloneUrl, setCloneUrl] = useState('');
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[]>([]);
  const [styleName, setStyleName] = useState('');
  const [styleStrength, setStyleStrength] = useState(75);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Style Library state */
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const [librarySort, setLibrarySort] = useState<string>('Popular');
  const [showMyStyles, setShowMyStyles] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  /* Apply Modal state */
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyModalStyleId, setApplyModalStyleId] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<'project' | 'shots'>('project');
  const [applyProject, setApplyProject] = useState(MOCK_PROJECTS[0].id);
  const [applySelectedShots, setApplySelectedShots] = useState<Set<string>>(new Set());
  const [applyStrength, setApplyStrength] = useState(75);
  const [applyBlend, setApplyBlend] = useState(false);

  /* Detail Panel state */
  const [detailPanelStyleId, setDetailPanelStyleId] = useState<string | null>(null);

  /* Cartoon Pro state */
  const [lineThickness, setLineThickness] = useState(2);
  const [lineCleanup, setLineCleanup] = useState(true);
  const [lineColor, setLineColor] = useState('#000000');
  const [shadingMode, setShadingMode] = useState<string>('Cel');
  const [shadowIntensity, setShadowIntensity] = useState(60);
  const [lightDirection, setLightDirection] = useState(45);
  const [squashStretch, setSquashStretch] = useState(50);
  const [smearFrames, setSmearFrames] = useState(false);
  const [poseExaggeration, setPoseExaggeration] = useState(40);
  const [anticipation, setAnticipation] = useState(true);
  const [animStyle, setAnimStyle] = useState<string>('Snappy');
  const [holdFrames, setHoldFrames] = useState(2);
  const [inbetweenQuality, setInbetweenQuality] = useState(80);
  const [visemeStyle, setVisemeStyle] = useState<string>('Anime');
  const [comicPanel, setComicPanel] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  /* Image to Cartoon state */
  const [i2cStyle, setI2cStyle] = useState<string>('Anime');
  const [i2cStrength, setI2cStrength] = useState(75);
  const [i2cPreserveDetails, setI2cPreserveDetails] = useState(true);
  const [i2cEnhanceEdges, setI2cEnhanceEdges] = useState(false);
  const [i2cColorCorrect, setI2cColorCorrect] = useState(true);
  const [i2cUploaded, setI2cUploaded] = useState(false);
  const [i2cConverted, setI2cConverted] = useState(false);
  const [i2cSliderPos, setI2cSliderPos] = useState(50);
  const [i2cDragging, setI2cDragging] = useState(false);
  const i2cFileRef = useRef<HTMLInputElement>(null);

  /* ── Clone Style Handlers ─────────────────────────────── */

  const simulateCloneProcess = useCallback(() => {
    const stages: CloneStage[] = ['uploading', 'analyzing-colors', 'extracting-motion', 'building-fingerprint', 'done'];
    let i = 0;
    setCloneStage(stages[0]);
    const interval = setInterval(() => {
      i++;
      if (i < stages.length) {
        setCloneStage(stages[i]);
      }
      if (i >= stages.length - 1) {
        clearInterval(interval);
        setStyleName('Extracted Style');
        toast.success('Style fingerprint extracted successfully');
      }
    }, 1500);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const valid = ['video/mp4', 'video/quicktime', 'image/gif', 'video/webm'];
      if (!valid.includes(file.type)) {
        toast.error('Unsupported format. Use MP4, MOV, GIF, or WEBM.');
        return;
      }
      toast.info(`Processing: ${file.name}`);
      simulateCloneProcess();
    }
  }, [simulateCloneProcess]);

  const handleDiscoverySearch = useCallback(() => {
    if (!discoveryQuery.trim()) return;
    setDiscoveryResults(MOCK_DISCOVERY_RESULTS);
    toast.info('Found 3 style references');
  }, [discoveryQuery]);

  /* ── Library Handlers ─────────────────────────────────── */

  function handleApply(id: string) {
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    toast.success(appliedIds.has(id) ? 'Style removed' : 'Style applied');
  }

  const filteredPacks = STYLE_PACKS.filter((p) => {
    if (libraryCategory !== 'All' && p.category !== libraryCategory) return false;
    if (librarySearch && !p.title.toLowerCase().includes(librarySearch.toLowerCase())) return false;
    if (showMyStyles && !p.isUserStyle) return false;
    return true;
  }).sort((a, b) => {
    if (librarySort === 'Popular') return b.downloads - a.downloads;
    if (librarySort === 'Name A-Z') return a.title.localeCompare(b.title);
    return 0;
  });

  /* ── Progress Label ────────────────────────────────────── */

  function cloneProgressLabel(): string {
    switch (cloneStage) {
      case 'uploading': return 'Uploading file...';
      case 'analyzing-colors': return 'Analyzing color palette...';
      case 'extracting-motion': return 'Extracting motion language...';
      case 'building-fingerprint': return 'Building fingerprint...';
      default: return '';
    }
  }

  function cloneProgressPercent(): number {
    switch (cloneStage) {
      case 'uploading': return 20;
      case 'analyzing-colors': return 45;
      case 'extracting-motion': return 70;
      case 'building-fingerprint': return 90;
      case 'done': return 100;
      default: return 0;
    }
  }

  /* ── Mouth shape labels ────────────────────────────────── */
  const mouthShapes = ['AA', 'EE', 'II', 'OO', 'UU', 'FF', 'TH', 'MM'];

  /* ── Render ────────────────────────────────────────────── */

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={20} style={{ color: 'var(--text-brand)' }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Style Studio
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              Extract, create, and apply visual styles
            </p>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--border)', paddingBottom: 0 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: isActive ? 'var(--brand-dim)' : 'transparent',
                  border: isActive ? '0.5px solid var(--brand-border)' : '0.5px solid transparent',
                  color: isActive ? 'var(--text-brand)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB: Clone Style
           ══════════════════════════════════════════════════ */}
        {activeTab === 'Clone Style' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 400 }}>
            {/* LEFT: Upload / Discovery */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['upload', 'discovery'] as CloneSubTab[]).map((st) => {
                  const active = cloneSubTab === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCloneSubTab(st)}
                      style={{
                        background: active ? 'var(--brand-dim)' : 'transparent',
                        border: active ? '0.5px solid var(--brand-border)' : '0.5px solid var(--border)',
                        color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st === 'upload' ? 'Upload' : 'AI Discovery'}
                    </button>
                  );
                })}
              </div>

              {cloneSubTab === 'upload' && (
                <>
                  {/* Drag-drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-xl)',
                      padding: '40px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease, background 0.2s ease',
                      background: isDragOver ? 'var(--brand-dim)' : 'transparent',
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <Upload size={28} style={{ color: 'var(--text-tertiary)' }} />
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
                      Drag & drop a video file here
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>
                      MP4, MOV, GIF, WEBM
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp4,.mov,.gif,.webm"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          toast.info(`Processing: ${e.target.files[0].name}`);
                          simulateCloneProcess();
                        }
                      }}
                    />
                  </div>

                  {/* URL input */}
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', textAlign: 'center' }}>
                      or enter URL
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="https://example.com/video.mp4"
                        value={cloneUrl}
                        onChange={(e) => setCloneUrl(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!cloneUrl.trim()) { toast.error('Enter a URL'); return; }
                          toast.info('Fetching video from URL...');
                          simulateCloneProcess();
                        }}
                        style={btnPrimary}
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {cloneSubTab === 'discovery' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div>
                    <p style={labelStyle}>Describe style to clone</p>
                    <textarea
                      placeholder='e.g. "Warm Wes Anderson palette with symmetrical framing, pastel tones, 35mm film grain..."'
                      value={discoveryQuery}
                      onChange={(e) => setDiscoveryQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDiscoverySearch(); } }}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 60 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Wes Anderson', '80s VHS', 'Studio Ghibli'].map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => { setDiscoveryQuery(ex); }}
                        style={{
                          ...badgeStyle,
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscoverySearch}
                    style={{ ...btnPrimary, justifyContent: 'center' }}
                  >
                    <Sparkles size={12} />
                    Find Style References
                  </button>

                  {/* Discovery results */}
                  {discoveryResults.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <p style={labelStyle}>References Found</p>
                      {discoveryResults.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: 10,
                            background: 'var(--bg-sunken)',
                            borderRadius: 'var(--radius-md)',
                            border: '0.5px solid var(--border)',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: r.thumbnail, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{r.title}</p>
                            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{r.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              toast.info(`Cloning: ${r.title}`);
                              simulateCloneProcess();
                            }}
                            style={{
                              ...btnPrimary,
                              padding: '5px 10px',
                              fontSize: 10,
                            }}
                          >
                            Clone this
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Progress indicator */}
              {cloneStage !== 'idle' && cloneStage !== 'done' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <Loader size={14} style={{ color: 'var(--text-brand)', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: 11, color: 'var(--text-brand)', margin: 0, fontWeight: 500 }}>
                    {cloneProgressLabel()}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT: Extraction Result Panel */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cloneStage !== 'done' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
                  <Palette size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
                    Upload or discover a style to extract its fingerprint
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Style Fingerprint
                  </p>

                  {/* Color Palette */}
                  <div>
                    <p style={labelStyle}>Color Palette</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {FINGERPRINT_COLORS.map((c) => (
                        <div
                          key={c}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            background: c,
                            border: '2px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease',
                          }}
                          title={c}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Contrast */}
                  <div>
                    <p style={labelStyle}>Contrast</p>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-sunken)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ width: '68%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--brand), #E74C3C)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Low</span>
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>High</span>
                    </div>
                  </div>

                  {/* Grain, Color Grade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={labelStyle}>Grain</p>
                      <span style={badgeStyle}>Medium (35%)</span>
                    </div>
                    <div>
                      <p style={labelStyle}>Color Grade</p>
                      <span style={badgeStyle}>Warm Teal/Orange</span>
                    </div>
                  </div>

                  {/* Camera Motion, Editing Rhythm, Lens */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={badgeStyle}>Camera: Slow Dolly</span>
                    <span style={badgeStyle}>Rhythm: 3.2s avg</span>
                    <span style={badgeStyle}>Lens: 35mm f/1.8</span>
                  </div>

                  {/* Confidence */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ ...labelStyle, margin: 0 }}>Confidence</p>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-sunken)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ width: '87%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--brand), #34d399)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-brand)', fontWeight: 700 }}>87%</span>
                  </div>

                  {/* Style Name + Strength */}
                  <div>
                    <p style={labelStyle}>Style Name</p>
                    <input
                      type="text"
                      value={styleName}
                      onChange={(e) => setStyleName(e.target.value)}
                      placeholder="Name this style..."
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={labelStyle}>Strength</p>
                      <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{styleStrength}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={styleStrength}
                      onChange={(e) => setStyleStrength(Number(e.target.value))}
                      style={sliderTrack}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => toast.success('Style saved to library')}
                      style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
                    >
                      <Bookmark size={12} />
                      Save to Library
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success('Style applied to project')}
                      style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
                    >
                      <Check size={12} />
                      Apply to Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: Cartoon Pro
           ══════════════════════════════════════════════════ */}
        {activeTab === 'Cartoon Pro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Presets Bar */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, marginRight: 4 }}>PRESETS:</span>
              {CARTOON_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setActivePreset(p);
                    toast.success(`Loaded preset: ${p}`);
                  }}
                  style={{
                    ...(activePreset === p ? { ...btnPrimary, padding: '5px 12px', fontSize: 10 } : { ...badgeStyle, cursor: 'pointer' }),
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => toast.success('Preset saved')}
                style={{ ...badgeStyle, cursor: 'pointer', color: 'var(--text-brand)' }}
              >
                <Plus size={10} />
                Save
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 420 }}>
              {/* LEFT: Controls */}
              <div style={{ ...panelStyle, overflowY: 'auto', maxHeight: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Line Art */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Line Art</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Thickness</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{lineThickness}px</span>
                      </div>
                      <input type="range" min={1} max={8} value={lineThickness} onChange={(e) => setLineThickness(Number(e.target.value))} style={sliderTrack} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={lineCleanup} onChange={(e) => setLineCleanup(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                        Cleanup
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        Color
                        <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Shading Style */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Shading Style</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {SHADING_MODES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setShadingMode(m)}
                          style={{
                            ...(shadingMode === m ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' } : { background: 'var(--bg-sunken)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                            padding: '5px 10px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 10,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Shadow Intensity</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{shadowIntensity}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={shadowIntensity} onChange={(e) => setShadowIntensity(Number(e.target.value))} style={sliderTrack} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={labelStyle}>Light Direction</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{lightDirection}°</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Compass size={14} style={{ color: 'var(--text-tertiary)', transform: `rotate(${lightDirection}deg)`, transition: 'transform 0.2s ease' }} />
                        <input type="range" min={0} max={360} value={lightDirection} onChange={(e) => setLightDirection(Number(e.target.value))} style={{ ...sliderTrack, flex: 1 }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Character Animation */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Character Animation</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Squash & Stretch</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{squashStretch}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={squashStretch} onChange={(e) => setSquashStretch(Number(e.target.value))} style={sliderTrack} />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={smearFrames} onChange={(e) => setSmearFrames(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                        Smear Frames
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={anticipation} onChange={(e) => setAnticipation(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                        Anticipation
                      </label>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Pose Exaggeration</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{poseExaggeration}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={poseExaggeration} onChange={(e) => setPoseExaggeration(Number(e.target.value))} style={sliderTrack} />
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Timing */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Timing</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <span style={labelStyle}>Animation Style</span>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {ANIMATION_STYLES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setAnimStyle(s)}
                            style={{
                              ...(animStyle === s ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' } : { background: 'var(--bg-sunken)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 10,
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Hold Frames</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{holdFrames}f</span>
                      </div>
                      <input type="range" min={0} max={6} value={holdFrames} onChange={(e) => setHoldFrames(Number(e.target.value))} style={sliderTrack} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={labelStyle}>Inbetween Quality</span>
                        <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{inbetweenQuality}%</span>
                      </div>
                      <input type="range" min={10} max={100} value={inbetweenQuality} onChange={(e) => setInbetweenQuality(Number(e.target.value))} style={sliderTrack} />
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Mouth / Dialogue */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Mouth / Dialogue</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <span style={labelStyle}>Viseme Style</span>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {VISEME_STYLES.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVisemeStyle(v)}
                            style={{
                              ...(visemeStyle === v ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' } : { background: 'var(--bg-sunken)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 10,
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span style={labelStyle}>Mouth Shapes</span>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {mouthShapes.map((ms) => (
                          <div
                            key={ms}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--bg-sunken)',
                              border: '0.5px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 9,
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {ms}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Special Modes */}
                <div>
                  <p style={{ ...labelStyle, fontSize: 11, color: 'var(--text-primary)' }}>Special Modes</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={comicPanel} onChange={(e) => setComicPanel(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                      Comic Panel Mode
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={onionSkin} onChange={(e) => setOnionSkin(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                      Onion Skin
                    </label>
                  </div>
                </div>
              </div>

              {/* RIGHT: Preview */}
              <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Preview</p>
                <div
                  style={{
                    flex: 1,
                    background: 'var(--bg-sunken)',
                    borderRadius: 'var(--radius-xl)',
                    border: '0.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 260,
                    padding: 16,
                  }}
                >
                  {/* SVG Cartoon Character - responds to settings */}
                  <svg viewBox="0 0 200 280" width="160" height="224" style={{ filter: `drop-shadow(${Math.round(Math.cos(lightDirection * Math.PI / 180) * 4)}px ${Math.round(Math.sin(lightDirection * Math.PI / 180) * 4)}px 6px rgba(0,0,0,${shadowIntensity / 100}))` }}>
                    {/* Head */}
                    <ellipse
                      cx="100"
                      cy="80"
                      rx={50 + (squashStretch > 50 ? (squashStretch - 50) * 0.2 : 0)}
                      ry={60 - (squashStretch > 50 ? (squashStretch - 50) * 0.15 : 0)}
                      fill={shadingMode === 'Flat' ? '#fdd' : '#fcc'}
                      stroke={lineColor}
                      strokeWidth={lineThickness}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* Shadow on face */}
                    {shadingMode !== 'Flat' && (
                      <ellipse
                        cx={100 + Math.cos(lightDirection * Math.PI / 180) * 15}
                        cy={80 + Math.sin(lightDirection * Math.PI / 180) * 15}
                        rx="30"
                        ry="35"
                        fill={`rgba(0,0,0,${shadowIntensity / 500})`}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                    )}
                    {/* Eyes */}
                    <ellipse cx="80" cy="70" rx="8" ry={10 + poseExaggeration * 0.05} fill="white" stroke={lineColor} strokeWidth={lineThickness * 0.7} />
                    <ellipse cx="120" cy="70" rx="8" ry={10 + poseExaggeration * 0.05} fill="white" stroke={lineColor} strokeWidth={lineThickness * 0.7} />
                    <circle cx="80" cy="72" r="4" fill={lineColor} />
                    <circle cx="120" cy="72" r="4" fill={lineColor} />
                    {/* Eyebrows */}
                    <line x1="72" y1={56 - poseExaggeration * 0.05} x2="88" y2="58" stroke={lineColor} strokeWidth={lineThickness} strokeLinecap="round" />
                    <line x1="112" y1="58" x2="128" y2={56 - poseExaggeration * 0.05} stroke={lineColor} strokeWidth={lineThickness} strokeLinecap="round" />
                    {/* Mouth - changes with viseme */}
                    {visemeStyle === 'Anime' ? (
                      <path d="M 85 100 Q 100 115 115 100" fill="none" stroke={lineColor} strokeWidth={lineThickness} strokeLinecap="round" />
                    ) : visemeStyle === 'Western' ? (
                      <ellipse cx="100" cy="102" rx="12" ry="6" fill="#e55" stroke={lineColor} strokeWidth={lineThickness * 0.7} />
                    ) : visemeStyle === 'Realistic' ? (
                      <path d="M 88 100 Q 94 98 100 100 Q 106 98 112 100 Q 106 108 100 110 Q 94 108 88 100" fill="#d44" stroke={lineColor} strokeWidth={lineThickness * 0.5} />
                    ) : (
                      <line x1="90" y1="102" x2="110" y2="102" stroke={lineColor} strokeWidth={lineThickness} strokeLinecap="round" />
                    )}
                    {/* Body */}
                    <rect
                      x="70"
                      y="135"
                      width="60"
                      height={70 + (squashStretch > 50 ? (squashStretch - 50) * 0.3 : 0)}
                      rx="12"
                      fill={shadingMode === 'Flat' ? '#7c3aed' : '#6d28d9'}
                      stroke={lineColor}
                      strokeWidth={lineThickness}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* Arms */}
                    <line x1="70" y1="155" x2={48 - poseExaggeration * 0.1} y2={185 + poseExaggeration * 0.1} stroke={lineColor} strokeWidth={lineThickness + 1} strokeLinecap="round" />
                    <line x1="130" y1="155" x2={152 + poseExaggeration * 0.1} y2={185 + poseExaggeration * 0.1} stroke={lineColor} strokeWidth={lineThickness + 1} strokeLinecap="round" />
                    {/* Legs */}
                    <line x1="88" y1="205" x2="82" y2="250" stroke={lineColor} strokeWidth={lineThickness + 1} strokeLinecap="round" />
                    <line x1="112" y1="205" x2="118" y2="250" stroke={lineColor} strokeWidth={lineThickness + 1} strokeLinecap="round" />
                    {/* Hatching overlay */}
                    {shadingMode === 'Hatching' && (
                      <g opacity={shadowIntensity / 200}>
                        {[0, 8, 16, 24, 32].map((offset) => (
                          <line key={offset} x1={75 + offset} y1="140" x2={70 + offset} y2="200" stroke={lineColor} strokeWidth={0.5} />
                        ))}
                      </g>
                    )}
                    {/* Onion skin ghost */}
                    {onionSkin && (
                      <g opacity={0.2} transform="translate(6, 0)">
                        <ellipse cx="100" cy="80" rx="50" ry="60" fill="none" stroke="#00d4ff" strokeWidth={1} />
                        <rect x="70" y="135" width="60" height="70" rx="12" fill="none" stroke="#00d4ff" strokeWidth={1} />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Mouth Chart */}
                <div>
                  <p style={labelStyle}>Phoneme Chart</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {mouthShapes.map((ms, i) => (
                      <div
                        key={ms}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-sunken)',
                          border: '0.5px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                      >
                        <svg viewBox="0 0 20 14" width="16" height="11">
                          {i < 2 ? (
                            <ellipse cx="10" cy="7" rx={6 + i * 2} ry={4 + i} fill="#e55" stroke={lineColor} strokeWidth={0.8} />
                          ) : i < 4 ? (
                            <circle cx="10" cy="7" r={4 + (i - 2)} fill="#e55" stroke={lineColor} strokeWidth={0.8} />
                          ) : i < 6 ? (
                            <path d={`M 4 ${8 - i * 0.3} Q 10 ${10 + i * 0.5} 16 ${8 - i * 0.3}`} fill="none" stroke={lineColor} strokeWidth={1} />
                          ) : (
                            <line x1="5" y1="7" x2="15" y2="7" stroke={lineColor} strokeWidth={1.2} strokeLinecap="round" />
                          )}
                        </svg>
                        <span style={{ fontSize: 7, fontWeight: 600, color: 'var(--text-tertiary)' }}>{ms}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => toast.success('Applied to project')}
                    style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
                  >
                    <Check size={12} />
                    Apply to Project
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Saved as preset')}
                    style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
                  >
                    <Bookmark size={12} />
                    Save as Preset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: Style Library
           ══════════════════════════════════════════════════ */}
        {activeTab === 'Style Library' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
                <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Search styles..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                />
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', gap: 3 }}>
                {LIBRARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLibraryCategory(cat)}
                    style={{
                      ...(libraryCategory === cat
                        ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' }
                        : { background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={librarySort}
                onChange={(e) => setLibrarySort(e.target.value)}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  padding: '5px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              {/* My Styles Toggle */}
              <button
                type="button"
                onClick={() => setShowMyStyles(!showMyStyles)}
                style={{
                  ...(showMyStyles
                    ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' }
                    : { ...btnSecondary }),
                  padding: '5px 12px',
                  fontSize: 10,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Star size={10} />
                My Styles
              </button>

              {/* Create Style Pack */}
              <button
                type="button"
                onClick={() => toast.info('Create Style Pack dialog coming soon')}
                style={{ ...btnPrimary, padding: '5px 12px', fontSize: 10 }}
              >
                <Plus size={10} />
                Create Style Pack
              </button>
            </div>

            {/* Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {filteredPacks.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>No styles found</p>
                </div>
              ) : (
                filteredPacks.map((pack) => {
                  const isApplied = appliedIds.has(pack.id);
                  const isHovered = hoveredCardId === pack.id;
                  return (
                    <div
                      key={pack.id}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        setHoveredCardId(pack.id);
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-brand)';
                      }}
                      onMouseLeave={(e) => {
                        setHoveredCardId(null);
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                      }}
                    >
                      {/* Gradient Preview */}
                      <div
                        style={{
                          height: 80,
                          background: `linear-gradient(135deg, ${pack.gradientFrom}, ${pack.gradientTo})`,
                          position: 'relative',
                        }}
                      >
                        {isApplied && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'var(--brand)',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={12} style={{ color: '#ffffff' }} />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        {isHovered && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.55)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toast.info(`Preview: ${pack.title}`); }}
                              style={{
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 9,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Eye size={10} /> Preview
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setApplyModalStyleId(pack.id); setApplyModalOpen(true); }}
                              style={{
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 9,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Check size={10} /> Apply
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDetailPanelStyleId(pack.id); }}
                              style={{
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#ffffff',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 9,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Info size={10} /> Details
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div style={{ padding: '10px 12px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            {pack.title}
                          </p>
                          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', background: 'var(--bg-sunken)', padding: '2px 6px', borderRadius: 'var(--radius-md)' }}>
                            {pack.category}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                          {pack.description}
                        </p>

                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <button
                            type="button"
                            onClick={() => handleApply(pack.id)}
                            style={{
                              background: isApplied ? 'var(--brand-dim)' : 'var(--brand)',
                              color: isApplied ? 'var(--text-brand)' : '#ffffff',
                              border: isApplied ? '0.5px solid var(--brand-border)' : 'none',
                              padding: '4px 12px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 10,
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                          >
                            {isApplied ? (<><Check size={10} /> Applied</>) : 'Apply'}
                          </button>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Download size={10} />
                            {formatDownloads(pack.downloads)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: Image to Cartoon
           ══════════════════════════════════════════════════ */}
        {activeTab === 'Image to Cartoon' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 400 }}>
            {/* LEFT: Upload + Options */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Upload Zone */}
              {i2cUploaded ? (
                <div style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                  position: 'relative',
                }}>
                  {/* Mock image preview */}
                  <div style={{
                    height: 120,
                    background: 'linear-gradient(135deg, #2a1a3e, #1a2a3e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Image size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setI2cUploaded(false); setI2cConverted(false); }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <X size={10} /> Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => i2cFileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
                >
                  <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Drop an image here or click to upload</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>PNG, JPG, WEBP</p>
                </div>
              )}
              <input
                ref={i2cFileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setI2cUploaded(true);
                    setI2cConverted(false);
                    toast.info(`Loaded: ${e.target.files[0].name}`);
                  }
                }}
              />

              {/* Style Picker Grid */}
              <div>
                <p style={labelStyle}>Cartoon Style</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {CARTOON_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setI2cStyle(s)}
                      style={{
                        ...(i2cStyle === s
                          ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' }
                          : { background: 'var(--bg-sunken)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                        padding: '8px 6px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strength */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={labelStyle}>Stylization Strength</p>
                  <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{i2cStrength}%</span>
                </div>
                <input type="range" min={10} max={100} value={i2cStrength} onChange={(e) => setI2cStrength(Number(e.target.value))} style={sliderTrack} />
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={labelStyle}>Options</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={i2cPreserveDetails} onChange={(e) => setI2cPreserveDetails(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                  Preserve fine details
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={i2cEnhanceEdges} onChange={(e) => setI2cEnhanceEdges(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                  Enhance edges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={i2cColorCorrect} onChange={(e) => setI2cColorCorrect(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                  Color correction
                </label>
              </div>

              {/* Convert Button */}
              <button
                type="button"
                onClick={() => {
                  if (!i2cUploaded) { toast.error('Upload an image first'); return; }
                  toast.info('Converting to cartoon...');
                  setTimeout(() => {
                    setI2cConverted(true);
                    toast.success('Conversion complete!');
                  }, 1500);
                }}
                style={{ ...btnPrimary, justifyContent: 'center', padding: '10px 16px' }}
              >
                <Sparkles size={14} />
                Convert
              </button>
            </div>

            {/* RIGHT: Before/After Display */}
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Before / After
              </p>

              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-xl)',
                  border: '0.5px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 260,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseMove={(e) => {
                  if (!i2cDragging) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                  setI2cSliderPos(pct);
                }}
                onMouseUp={() => setI2cDragging(false)}
                onMouseLeave={() => setI2cDragging(false)}
              >
                {i2cConverted ? (
                  <>
                    {/* Before side (full background) */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2a1a3e, #1a2a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ORIGINAL</span>
                    </div>
                    {/* After side (clipped) */}
                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - i2cSliderPos}% 0 0)`, background: 'linear-gradient(135deg, #4a2a6e, #2a4a6e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>CARTOON</span>
                    </div>
                    {/* Drag handle */}
                    <div
                      onMouseDown={() => setI2cDragging(true)}
                      style={{
                        position: 'absolute',
                        left: `${i2cSliderPos}%`,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: '#ffffff',
                        cursor: 'ew-resize',
                        zIndex: 10,
                        transform: 'translateX(-50%)',
                        boxShadow: '0 0 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <GripVertical size={12} style={{ color: '#333' }} />
                      </div>
                    </div>
                    {/* Labels */}
                    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 5 }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>Before</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 5 }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>After</span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Image size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4, marginBottom: 8 }} />
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                      Upload an image and convert to see comparison
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!i2cConverted) { toast.error('Convert an image first'); return; }
                    toast.success('Image downloaded');
                  }}
                  style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
                >
                  <Download size={12} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!i2cConverted) { toast.error('Convert an image first'); return; }
                    router.push('/characters/new');
                  }}
                  style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
                >
                  <UserCircle size={12} />
                  Create Character
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          SS-3: Apply Style Modal
         ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {applyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setApplyModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...panelStyle,
                width: 420,
                maxWidth: '90vw',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Apply Style: {STYLE_PACKS.find((p) => p.id === applyModalStyleId)?.title}
                </p>
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Target selector */}
              <div>
                <p style={labelStyle}>Apply To</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['project', 'shots'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setApplyTarget(t)}
                      style={{
                        ...(applyTarget === t
                          ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--text-brand)' }
                          : { background: 'var(--bg-sunken)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }),
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textTransform: 'capitalize' as const,
                      }}
                    >
                      {t === 'project' ? 'Entire Project' : 'Selected Shots'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project picker */}
              <div>
                <p style={labelStyle}>Project</p>
                <select
                  value={applyProject}
                  onChange={(e) => setApplyProject(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {MOCK_PROJECTS.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              {/* Shot multi-select (only if target is shots) */}
              {applyTarget === 'shots' && (
                <div>
                  <p style={labelStyle}>Shots</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {MOCK_SHOTS.map((shot) => {
                      const isSelected = applySelectedShots.has(shot.id);
                      return (
                        <label
                          key={shot.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'var(--brand-dim)' : 'var(--bg-sunken)',
                            border: `0.5px solid ${isSelected ? 'var(--brand-border)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            fontSize: 11,
                            color: isSelected ? 'var(--text-brand)' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setApplySelectedShots((prev) => {
                                const next = new Set(prev);
                                if (next.has(shot.id)) { next.delete(shot.id); } else { next.add(shot.id); }
                                return next;
                              });
                            }}
                            style={{ accentColor: 'var(--brand)' }}
                          />
                          {shot.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strength slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={labelStyle}>Strength</p>
                  <span style={{ fontSize: 10, color: 'var(--text-brand)', fontWeight: 600 }}>{applyStrength}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={applyStrength}
                  onChange={(e) => setApplyStrength(Number(e.target.value))}
                  style={sliderTrack}
                />
              </div>

              {/* Blend toggle */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={applyBlend}
                  onChange={(e) => setApplyBlend(e.target.checked)}
                  style={{ accentColor: 'var(--brand)' }}
                />
                Blend with existing style
              </label>

              {/* Apply button */}
              <button
                type="button"
                onClick={() => {
                  const styleName = STYLE_PACKS.find((p) => p.id === applyModalStyleId)?.title;
                  const projectName = MOCK_PROJECTS.find((p) => p.id === applyProject)?.name;
                  if (applyTarget === 'shots' && applySelectedShots.size === 0) {
                    toast.error('Select at least one shot');
                    return;
                  }
                  toast.success(`Applied "${styleName}" to ${applyTarget === 'project' ? projectName : `${applySelectedShots.size} shot(s)`} at ${applyStrength}%`);
                  setApplyModalOpen(false);
                }}
                style={{ ...btnPrimary, justifyContent: 'center', padding: '10px 16px' }}
              >
                <Check size={14} />
                Apply Style
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════
          SS-4: Style Detail Panel (slides from right)
         ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {detailPanelStyleId && (() => {
          const pack = STYLE_PACKS.find((p) => p.id === detailPanelStyleId);
          const details = STYLE_DETAILS[detailPanelStyleId];
          if (!pack || !details) return null;
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 900,
                }}
                onClick={() => setDetailPanelStyleId(null)}
              />
              {/* Panel */}
              <motion.div
                initial={{ x: 380 }}
                animate={{ x: 0 }}
                exit={{ x: 380 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 380,
                  background: 'var(--bg-elevated)',
                  borderLeft: '0.5px solid var(--border)',
                  zIndex: 950,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  padding: 20,
                  boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                }}
              >
                {/* Close */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {pack.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDetailPanelStyleId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Preview gradient */}
                <div style={{
                  height: 100,
                  borderRadius: 'var(--radius-xl)',
                  background: `linear-gradient(135deg, ${pack.gradientFrom}, ${pack.gradientTo})`,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div className="style-hover-shimmer" style={{ position: 'absolute', inset: 0 }} />
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {pack.description}
                </p>

                {/* Creator info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--border)',
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--brand-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Users size={14} style={{ color: 'var(--text-brand)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {details.creator}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                      Used by {details.usedBy} creators
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{details.rating}</span>
                  </div>
                </div>

                {/* Fingerprint data */}
                <div>
                  <p style={labelStyle}>Color Palette</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {details.palette.map((c) => (
                      <div
                        key={c}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-md)',
                          background: c,
                          border: '2px solid var(--border)',
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={labelStyle}>Contrast</p>
                    <span style={badgeStyle}>{details.contrast}</span>
                  </div>
                  <div>
                    <p style={labelStyle}>Film Grain</p>
                    <span style={badgeStyle}>{details.grain}</span>
                  </div>
                  <div>
                    <p style={labelStyle}>Camera Motion</p>
                    <span style={badgeStyle}>{details.camera}</span>
                  </div>
                  <div>
                    <p style={labelStyle}>Edit Rhythm</p>
                    <span style={badgeStyle}>{details.editRhythm}</span>
                  </div>
                </div>

                <div>
                  <p style={labelStyle}>Category</p>
                  <span style={badgeStyle}>{pack.category}</span>
                </div>

                <div>
                  <p style={labelStyle}>Downloads</p>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {formatDownloads(pack.downloads)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setApplyModalStyleId(pack.id);
                      setApplyModalOpen(true);
                      setDetailPanelStyleId(null);
                    }}
                    style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
                  >
                    <Check size={12} />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`${pack.title} added to library`);
                    }}
                    style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
                  >
                    <Bookmark size={12} />
                    Add to Library
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Keyframe animation for loader spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
