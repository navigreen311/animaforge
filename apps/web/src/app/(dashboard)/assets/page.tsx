'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Upload,
  Image,
  Film,
  Music,
  Box,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Eye,
  Crosshair,
  Download,
  MoreHorizontal,
  Star,
  Clock,
  AlertCircle,
  Archive,
  Check,
  Trash2,
  FolderInput,
  Plus,
  Pencil,
  Package,
  Sliders,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';

// ── Types ────────────────────────────────────────────────────────
type AssetType = 'image' | 'video' | 'audio' | '3d' | 'style-pack' | 'preset';
type RightsType = 'ai-generated' | 'uploaded' | 'licensed' | 'expired';
type ViewMode = 'grid' | 'list';
type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-newest'
  | 'date-oldest'
  | 'size-largest'
  | 'size-smallest'
  | 'most-used'
  | 'least-used';
type FilterTab = 'all' | 'image' | 'video' | 'audio' | '3d' | 'style-pack' | 'preset';

interface Asset {
  id: string;
  filename: string;
  type: AssetType;
  sizeBytes: number;
  size: string;
  dimensions: string;
  rights: RightsType;
  tags: string[];
  usedInShots: number;
  uploadDate: string;
  lastUsed: string;
  category: string;
  favourite: boolean;
  color: string;
  license?: string;
  source?: string;
  commercialUse?: boolean;
  usageRefs?: string[];
}

// ── Constants ────────────────────────────────────────────────────
const TYPE_COLORS: Record<AssetType, string> = {
  image: '#3b82f6',
  video: '#f97316',
  audio: '#22c55e',
  '3d': '#a855f7',
  'style-pack': '#ec4899',
  preset: '#06b6d4',
};

const TYPE_LABELS: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D Model',
  'style-pack': 'Style Pack',
  preset: 'Preset',
};

const RIGHTS_COLORS: Record<RightsType, { bg: string; text: string }> = {
  'ai-generated': { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' },
  uploaded: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
  licensed: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' },
  expired: { bg: 'rgba(239,68,68,0.15)', text: '#f87171' },
};

const RIGHTS_LABELS: Record<RightsType, string> = {
  'ai-generated': 'AI Generated',
  uploaded: 'Uploaded',
  licensed: 'Licensed',
  expired: 'Expired',
};

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: '3D Models', value: '3d' },
  { label: 'Style Packs', value: 'style-pack' },
  { label: 'Presets', value: 'preset' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Name Z-A', value: 'name-desc' },
  { label: 'Date (Newest)', value: 'date-newest' },
  { label: 'Date (Oldest)', value: 'date-oldest' },
  { label: 'Size (Largest)', value: 'size-largest' },
  { label: 'Size (Smallest)', value: 'size-smallest' },
  { label: 'Most Used', value: 'most-used' },
  { label: 'Least Used', value: 'least-used' },
];

// ── Category sidebar definition ──────────────────────────────────
interface CategoryEntry {
  label: string;
  count: number;
  icon?: 'star' | 'clock' | 'alert';
}

const CATEGORIES: CategoryEntry[] = [
  { label: 'Characters', count: 12 },
  { label: 'Backgrounds', count: 8 },
  { label: 'Props', count: 24 },
  { label: 'Textures', count: 15 },
  { label: 'Style Packs', count: 6 },
  { label: 'Motion Presets', count: 4 },
  { label: 'Audio Presets', count: 9 },
  { label: 'Shot Templates', count: 3 },
  { label: 'Favourites', count: 7, icon: 'star' },
  { label: 'Recently Used', count: 10, icon: 'clock' },
  { label: 'Unused', count: 18, icon: 'alert' },
];

// ── Mock Data ────────────────────────────────────────────────────
const ASSETS: Asset[] = [
  {
    id: 'asset-1',
    filename: 'hero_pose_v2.png',
    type: 'image',
    sizeBytes: 2516582,
    size: '2.4 MB',
    dimensions: '1920x1080',
    rights: 'ai-generated',
    tags: ['character', 'hero', 'pose'],
    usedInShots: 5,
    uploadDate: '2026-03-10',
    lastUsed: '2026-03-24',
    category: 'Characters',
    favourite: true,
    color: TYPE_COLORS.image,
    source: 'AnimaForge Gen v3',
    license: 'AI Output License',
    commercialUse: true,
    usageRefs: ['Project Alpha / Shot 3', 'Project Alpha / Shot 7', 'Project Beta / Shot 1', 'Project Beta / Shot 12', 'Project Gamma / Shot 2'],
  },
  {
    id: 'asset-2',
    filename: 'explosion_sfx.wav',
    type: 'audio',
    sizeBytes: 876544,
    size: '856 KB',
    dimensions: '0:03 stereo',
    rights: 'licensed',
    tags: ['sfx', 'explosion', 'action'],
    usedInShots: 8,
    uploadDate: '2026-02-18',
    lastUsed: '2026-03-22',
    category: 'Audio Presets',
    favourite: false,
    color: TYPE_COLORS.audio,
    source: 'SoundLib Pro',
    license: 'Royalty-Free Commercial',
    commercialUse: true,
    usageRefs: ['Project Alpha / Shot 5', 'Project Alpha / Shot 9'],
  },
  {
    id: 'asset-3',
    filename: 'kai_model_rigged.glb',
    type: '3d',
    sizeBytes: 13421773,
    size: '12.8 MB',
    dimensions: '45K polys',
    rights: 'uploaded',
    tags: ['character', '3d', 'rigged'],
    usedInShots: 3,
    uploadDate: '2026-01-15',
    lastUsed: '2026-03-20',
    category: 'Characters',
    favourite: true,
    color: TYPE_COLORS['3d'],
    source: 'User upload',
    license: 'Owned',
    commercialUse: true,
    usageRefs: ['Project Alpha / Shot 1', 'Project Alpha / Shot 2', 'Project Alpha / Shot 4'],
  },
  {
    id: 'asset-4',
    filename: 'background_loop.mp4',
    type: 'video',
    sizeBytes: 35862118,
    size: '34.2 MB',
    dimensions: '3840x2160 / 0:12',
    rights: 'ai-generated',
    tags: ['background', 'loop', 'ambient'],
    usedInShots: 2,
    uploadDate: '2026-03-05',
    lastUsed: '2026-03-18',
    category: 'Backgrounds',
    favourite: false,
    color: TYPE_COLORS.video,
    source: 'AnimaForge Gen v3',
    license: 'AI Output License',
    commercialUse: true,
    usageRefs: ['Project Beta / Shot 4', 'Project Gamma / Shot 6'],
  },
  {
    id: 'asset-5',
    filename: 'watercolor_texture_4k.png',
    type: 'image',
    sizeBytes: 5347737,
    size: '5.1 MB',
    dimensions: '4096x4096',
    rights: 'uploaded',
    tags: ['texture', 'watercolor', 'style'],
    usedInShots: 0,
    uploadDate: '2025-12-01',
    lastUsed: 'Never',
    category: 'Textures',
    favourite: false,
    color: TYPE_COLORS.image,
    source: 'User upload',
    license: 'Owned',
    commercialUse: true,
    usageRefs: [],
  },
  {
    id: 'asset-6',
    filename: 'footsteps_gravel.wav',
    type: 'audio',
    sizeBytes: 1258291,
    size: '1.2 MB',
    dimensions: '0:08 mono',
    rights: 'licensed',
    tags: ['sfx', 'footsteps', 'foley'],
    usedInShots: 12,
    uploadDate: '2026-02-22',
    lastUsed: '2026-03-25',
    category: 'Audio Presets',
    favourite: true,
    color: TYPE_COLORS.audio,
    source: 'FoleyOne',
    license: 'Royalty-Free Commercial',
    commercialUse: true,
    usageRefs: ['Project Alpha / Shot 2', 'Project Beta / Shot 8'],
  },
  {
    id: 'asset-7',
    filename: 'luna_rig_final.glb',
    type: '3d',
    sizeBytes: 19188736,
    size: '18.3 MB',
    dimensions: '62K polys',
    rights: 'expired',
    tags: ['character', '3d', 'rig', 'luna'],
    usedInShots: 1,
    uploadDate: '2025-11-10',
    lastUsed: '2025-12-05',
    category: 'Characters',
    favourite: false,
    color: TYPE_COLORS['3d'],
    source: 'External artist',
    license: 'Expired Dec 2025',
    commercialUse: false,
    usageRefs: ['Project Alpha / Shot 10'],
  },
  {
    id: 'asset-8',
    filename: 'title_animation_intro.mp4',
    type: 'video',
    sizeBytes: 9122611,
    size: '8.7 MB',
    dimensions: '1920x1080 / 0:04',
    rights: 'ai-generated',
    tags: ['title', 'motion', 'intro'],
    usedInShots: 4,
    uploadDate: '2026-03-12',
    lastUsed: '2026-03-24',
    category: 'Props',
    favourite: true,
    color: TYPE_COLORS.video,
    source: 'AnimaForge Gen v3',
    license: 'AI Output License',
    commercialUse: true,
    usageRefs: ['Project Alpha / Shot 1', 'Project Beta / Shot 1', 'Project Beta / Shot 14', 'Project Gamma / Shot 1'],
  },
];

// ── Storage breakdown (mock) ─────────────────────────────────────
const STORAGE = {
  total: 10 * 1024 * 1024 * 1024, // 10 GB
  used: 2.4 * 1024 * 1024 * 1024,
  breakdown: [
    { type: 'Images' as const, bytes: 0.8 * 1024 * 1024 * 1024, color: '#3b82f6' },
    { type: 'Videos' as const, bytes: 0.9 * 1024 * 1024 * 1024, color: '#f97316' },
    { type: 'Audio' as const, bytes: 0.3 * 1024 * 1024 * 1024, color: '#22c55e' },
    { type: '3D' as const, bytes: 0.4 * 1024 * 1024 * 1024, color: '#a855f7' },
  ],
  archiveCandidates: 18,
};

const usagePercent = (STORAGE.used / STORAGE.total) * 100;
const isStorageWarning = usagePercent > 80;

// ── Helper: format GB ────────────────────────────────────────────
function fmtGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ── Asset icon component ─────────────────────────────────────────
function AssetIcon({ type, size }: { type: AssetType; size: number }) {
  const style = { color: 'rgba(255,255,255,0.7)' };
  switch (type) {
    case 'image':
      return <Image size={size} style={style} />;
    case 'video':
      return <Film size={size} style={style} />;
    case 'audio':
      return <Music size={size} style={style} />;
    case '3d':
      return <Box size={size} style={style} />;
    case 'style-pack':
      return <Palette size={size} style={style} />;
    case 'preset':
      return <Sliders size={size} style={style} />;
  }
}

// ── Waveform bars (audio thumbnail) ──────────────────────────────
function WaveformBars() {
  const bars = [0.3, 0.6, 1, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.3];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: h * 28,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  );
}

// ── Category icon helper ─────────────────────────────────────────
function CategoryIcon({ icon }: { icon?: string }) {
  if (icon === 'star') return <Star size={12} style={{ color: '#fbbf24' }} />;
  if (icon === 'clock') return <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />;
  if (icon === 'alert') return <AlertCircle size={12} style={{ color: 'var(--text-tertiary)' }} />;
  return null;
}

// ── Main Component ───────────────────────────────────────────────
export default function AssetsPage() {
  // State
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingTags, setEditingTags] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  // Rights filter checkboxes
  const [rightsFilters, setRightsFilters] = useState<Set<RightsType>>(new Set());
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  // Computed
  const detailAsset = detailAssetId ? ASSETS.find((a) => a.id === detailAssetId) ?? null : null;

  const activeFilters = useMemo(() => {
    const pills: { label: string; key: string }[] = [];
    rightsFilters.forEach((r) => pills.push({ label: RIGHTS_LABELS[r], key: `rights-${r}` }));
    if (usageFilter !== 'all') pills.push({ label: usageFilter === 'used' ? 'Used' : 'Unused', key: `usage-${usageFilter}` });
    return pills;
  }, [rightsFilters, usageFilter]);

  const removeFilter = useCallback((key: string) => {
    if (key.startsWith('rights-')) {
      const r = key.replace('rights-', '') as RightsType;
      setRightsFilters((prev) => { const next = new Set(prev); next.delete(r); return next; });
    } else if (key.startsWith('usage-')) {
      setUsageFilter('all');
    }
  }, []);

  const filtered = useMemo(() => {
    let result = ASSETS.filter((a) => {
      if (activeTab !== 'all' && a.type !== activeTab) return false;
      if (activeCategory && a.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!a.filename.toLowerCase().includes(q) && !a.tags.some((t) => t.includes(q))) return false;
      }
      if (rightsFilters.size > 0 && !rightsFilters.has(a.rights)) return false;
      if (usageFilter === 'used' && a.usedInShots === 0) return false;
      if (usageFilter === 'unused' && a.usedInShots > 0) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.filename.localeCompare(b.filename);
        case 'name-desc': return b.filename.localeCompare(a.filename);
        case 'date-newest': return b.uploadDate.localeCompare(a.uploadDate);
        case 'date-oldest': return a.uploadDate.localeCompare(b.uploadDate);
        case 'size-largest': return b.sizeBytes - a.sizeBytes;
        case 'size-smallest': return a.sizeBytes - b.sizeBytes;
        case 'most-used': return b.usedInShots - a.usedInShots;
        case 'least-used': return a.usedInShots - b.usedInShots;
        default: return 0;
      }
    });

    return result;
  }, [activeTab, activeCategory, searchQuery, sortBy, rightsFilters, usageFilter]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const hasSelection = selectedIds.size > 0;

  const openDetail = useCallback((asset: Asset) => {
    setDetailAssetId(asset.id);
    setEditingName(false);
    setEditingTags(false);
    setEditNameValue(asset.filename);
  }, []);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Asset Library
              </h1>
              <button
                type="button"
                onClick={() => toast.success('Upload dialog opened')}
                style={{
                  background: 'var(--brand)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={13} />
                Upload
              </button>
            </div>

            {/* Storage bar */}
            <div style={{ marginTop: 12, maxWidth: 480 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: isStorageWarning ? '#f97316' : 'var(--text-secondary)' }}>
                  {fmtGB(STORAGE.used)} / {fmtGB(STORAGE.total)}
                </span>
                {isStorageWarning && <AlertCircle size={12} style={{ color: '#f97316' }} />}
              </div>

              {/* Segmented bar */}
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'var(--bg-hover)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                {STORAGE.breakdown.map((seg) => (
                  <div
                    key={seg.type}
                    style={{
                      width: `${(seg.bytes / STORAGE.total) * 100}%`,
                      height: '100%',
                      background: seg.color,
                    }}
                    title={`${seg.type}: ${fmtGB(seg.bytes)}`}
                  />
                ))}
              </div>

              {/* Breakdown legend */}
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {STORAGE.breakdown.map((seg) => (
                  <div key={seg.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {seg.type} {fmtGB(seg.bytes)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Archive candidates */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <Archive size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {STORAGE.archiveCandidates} assets not accessed in 90+ days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Type Tabs ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--border)', paddingBottom: 8 }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setActiveTab(tab.value); setActiveCategory(null); }}
              style={{
                background: activeTab === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === tab.value ? '0.5px solid var(--border)' : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeTab === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content Area: Sidebar + Grid ────────────────── */}
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          {/* Category Sidebar (only on "All" tab) */}
          {activeTab === 'all' && (
            <div
              style={{
                width: 160,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
              }}
            >
              {/* "All" category option */}
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                style={{
                  background: activeCategory === null ? 'var(--bg-active)' : 'transparent',
                  color: activeCategory === null ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: activeCategory === null ? 500 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>All Categories</span>
              </button>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(cat.label)}
                  style={{
                    background: activeCategory === cat.label ? 'var(--bg-active)' : 'transparent',
                    color: activeCategory === cat.label ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    fontWeight: activeCategory === cat.label ? 500 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CategoryIcon icon={cat.icon} />
                    {cat.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      background: 'var(--bg-hover)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Right side: filter bar + grid/list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {/* ── Filter / Sort Bar ───────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {/* Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 10px',
                  minWidth: 180,
                  flex: 1,
                  maxWidth: 280,
                }}
              >
                <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    width: '100%',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={12} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '5px 10px',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                  <ChevronDown size={12} />
                </button>
                {showSortDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'var(--bg-overlay)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 4,
                      zIndex: 20,
                      minWidth: 160,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          background: sortBy === opt.value ? 'var(--bg-active)' : 'transparent',
                          border: 'none',
                          padding: '6px 10px',
                          fontSize: 11,
                          color: sortBy === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
                  style={{
                    background: activeFilters.length > 0 ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                    border: activeFilters.length > 0 ? '0.5px solid var(--brand-border)' : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '5px 10px',
                    fontSize: 11,
                    color: activeFilters.length > 0 ? 'var(--text-brand)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Filter {activeFilters.length > 0 && `(${activeFilters.length})`}
                  <ChevronDown size={12} />
                </button>
                {showFilterDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'var(--bg-overlay)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 8,
                      zIndex: 20,
                      minWidth: 180,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rights</p>
                    {(Object.keys(RIGHTS_LABELS) as RightsType[]).map((r) => (
                      <label
                        key={r}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 0',
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={rightsFilters.has(r)}
                          onChange={() => {
                            setRightsFilters((prev) => {
                              const next = new Set(prev);
                              if (next.has(r)) next.delete(r); else next.add(r);
                              return next;
                            });
                          }}
                          style={{ accentColor: 'var(--brand)' }}
                        />
                        {RIGHTS_LABELS[r]}
                      </label>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Usage</p>
                    {(['all', 'used', 'unused'] as const).map((u) => (
                      <label
                        key={u}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 0',
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="usageFilter"
                          checked={usageFilter === u}
                          onChange={() => setUsageFilter(u)}
                          style={{ accentColor: 'var(--brand)' }}
                        />
                        {u === 'all' ? 'All' : u === 'used' ? 'Used' : 'Unused'}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid/List toggle */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  marginLeft: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? 'var(--bg-active)' : 'transparent',
                    border: 'none',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <LayoutGrid size={13} style={{ color: viewMode === 'grid' ? 'var(--text-brand)' : 'var(--text-tertiary)' }} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    background: viewMode === 'list' ? 'var(--bg-active)' : 'transparent',
                    border: 'none',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <List size={13} style={{ color: viewMode === 'list' ? 'var(--text-brand)' : 'var(--text-tertiary)' }} />
                </button>
              </div>
            </div>

            {/* Active filter pills */}
            {activeFilters.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeFilters.map((f) => (
                  <span
                    key={f.key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--brand-dim)',
                      border: '0.5px solid var(--brand-border)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '3px 10px',
                      fontSize: 10,
                      color: 'var(--text-brand)',
                    }}
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={() => removeFilter(f.key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={10} style={{ color: 'var(--text-brand)' }} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* ── Bulk Selection Bar ─────────────────────── */}
            {hasSelection && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--bg-overlay)',
                  border: '0.5px solid var(--brand-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 14px',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {selectedIds.size} selected
                </span>
                <button type="button" onClick={selectAll} style={bulkBtnStyle}>Select all</button>
                <button type="button" onClick={clearSelection} style={bulkBtnStyle}>Clear</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                <button type="button" onClick={() => toast.success('Downloading ZIP...')} style={bulkBtnStyle}>
                  <Download size={11} /> Download ZIP
                </button>
                <button type="button" onClick={() => toast.success('Added to project')} style={bulkBtnStyle}>
                  <Plus size={11} /> Add to Project
                </button>
                <button type="button" onClick={() => toast.info('Move dialog opened')} style={bulkBtnStyle}>
                  <FolderInput size={11} /> Move to...
                </button>
                <button
                  type="button"
                  onClick={() => { toast.error('Delete not available in demo'); }}
                  style={{ ...bulkBtnStyle, color: '#f87171' }}
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}

            {/* ── Grid View ──────────────────────────────── */}
            {viewMode === 'grid' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                {filtered.map((asset) => {
                  const isHovered = hoveredCard === asset.id;
                  const isSelected = selectedIds.has(asset.id);
                  const showCheckbox = isHovered || hasSelection;

                  return (
                    <div
                      key={asset.id}
                      onMouseEnter={() => setHoveredCard(asset.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => openDetail(asset)}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: isHovered
                          ? '0.5px solid var(--border-brand)'
                          : isSelected
                            ? '0.5px solid var(--brand-border)'
                            : '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 150ms ease',
                        position: 'relative',
                      }}
                    >
                      {/* Checkbox */}
                      {showCheckbox && (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            zIndex: 5,
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.5)',
                            border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                        </div>
                      )}

                      {/* Thumbnail area */}
                      <div
                        style={{
                          height: 72,
                          background: asset.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        {asset.type === 'audio' ? (
                          <WaveformBars />
                        ) : (
                          <AssetIcon type={asset.type} size={28} />
                        )}

                        {/* Quick action buttons on hover */}
                        {isHovered && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              right: 6,
                              display: 'flex',
                              gap: 4,
                            }}
                          >
                            {[
                              { icon: <Eye size={12} />, label: 'Preview', action: () => toast.info(`Preview: ${asset.filename}`) },
                              { icon: <Crosshair size={12} />, label: 'Use in Shot', action: () => toast.success('Added to current shot') },
                              { icon: <Download size={12} />, label: 'Download', action: () => toast.success('Downloading...') },
                              { icon: <MoreHorizontal size={12} />, label: 'More', action: () => openDetail(asset) },
                            ].map((btn) => (
                              <button
                                key={btn.label}
                                type="button"
                                title={btn.label}
                                onClick={btn.action}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(0,0,0,0.6)',
                                  backdropFilter: 'blur(4px)',
                                  border: '0.5px solid rgba(255,255,255,0.15)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                }}
                              >
                                {btn.icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div style={{ padding: '10px 12px 12px' }}>
                        {/* Filename */}
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {asset.filename}
                        </p>

                        {/* Type pill + size + rights badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-hover)',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            {TYPE_LABELS[asset.type]}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{asset.size}</span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-md)',
                              background: RIGHTS_COLORS[asset.rights].bg,
                              color: RIGHTS_COLORS[asset.rights].text,
                            }}
                          >
                            {RIGHTS_LABELS[asset.rights]}
                          </span>
                        </div>

                        {/* Usage count */}
                        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '5px 0 0' }}>
                          Used in {asset.usedInShots} shot{asset.usedInShots !== 1 ? 's' : ''}
                        </p>

                        {/* Tags (first 2) */}
                        {asset.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                            {asset.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: 9,
                                  color: 'var(--text-tertiary)',
                                  background: 'var(--bg-hover)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {asset.tags.length > 2 && (
                              <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                                +{asset.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── List View ──────────────────────────────── */}
            {viewMode === 'list' && (
              <div
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Table header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 40px 1fr 80px 70px 100px 90px 70px 90px 80px',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 12px',
                    height: 36,
                    background: 'var(--bg-overlay)',
                    borderBottom: '0.5px solid var(--border)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  <span />
                  <span />
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Dimensions</span>
                  <span>Rights</span>
                  <span>Used in</span>
                  <span>Uploaded</span>
                  <span>Actions</span>
                </div>

                {/* Table rows */}
                {filtered.map((asset) => {
                  const isSelected = selectedIds.has(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => openDetail(asset)}
                      onMouseEnter={() => setHoveredCard(asset.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 40px 1fr 80px 70px 100px 90px 70px 90px 80px',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0 12px',
                        height: 52,
                        borderBottom: '0.5px solid var(--border)',
                        cursor: 'pointer',
                        background: hoveredCard === asset.id ? 'var(--bg-hover)' : 'transparent',
                        transition: 'background 100ms ease',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          background: isSelected ? 'var(--brand)' : 'transparent',
                          border: isSelected ? 'none' : '1px solid var(--border-strong)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected && <Check size={10} style={{ color: '#fff' }} />}
                      </div>

                      {/* Thumbnail */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-sm)',
                          background: asset.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AssetIcon type={asset.type} size={16} />
                      </div>

                      {/* Name */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {asset.filename}
                      </span>

                      {/* Type */}
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-hover)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          width: 'fit-content',
                        }}
                      >
                        {TYPE_LABELS[asset.type]}
                      </span>

                      {/* Size */}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{asset.size}</span>

                      {/* Dimensions */}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{asset.dimensions}</span>

                      {/* Rights */}
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          background: RIGHTS_COLORS[asset.rights].bg,
                          color: RIGHTS_COLORS[asset.rights].text,
                          width: 'fit-content',
                        }}
                      >
                        {RIGHTS_LABELS[asset.rights]}
                      </span>

                      {/* Used in */}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{asset.usedInShots} shots</span>

                      {/* Uploaded */}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{asset.uploadDate}</span>

                      {/* Actions */}
                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          title="Preview"
                          onClick={() => toast.info(`Preview: ${asset.filename}`)}
                          style={listActionBtnStyle}
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          title="Download"
                          onClick={() => toast.success('Downloading...')}
                          style={listActionBtnStyle}
                        >
                          <Download size={12} />
                        </button>
                        <button
                          type="button"
                          title="More"
                          onClick={() => openDetail(asset)}
                          style={listActionBtnStyle}
                        >
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Empty State ────────────────────────────── */}
            {filtered.length === 0 && (
              <EmptyState
                icon={Package}
                title="No assets found"
                description="Try adjusting your filters or search query, or upload your first asset."
                action={{ label: 'Upload Asset', onClick: () => toast('Upload coming soon') }}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Detail Panel (slide-in from right) ─────────────── */}
      {detailAsset && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDetailAssetId(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 30,
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 360,
              background: 'var(--bg-surface)',
              borderLeft: '0.5px solid var(--border)',
              zIndex: 31,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Asset Details</span>
              <button
                type="button"
                onClick={() => setDetailAssetId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Large preview */}
            <div
              style={{
                height: 180,
                background: detailAsset.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {detailAsset.type === 'audio' ? (
                <WaveformBars />
              ) : (
                <AssetIcon type={detailAsset.type} size={48} />
              )}
            </div>

            {/* Metadata */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Editable name */}
              <div>
                <label style={detailLabelStyle}>Name</label>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { toast.success('Name updated'); setEditingName(false); }}
                      style={{ ...detailActionBtnStyle, background: 'var(--brand)', color: '#fff' }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditNameValue(detailAsset.filename); setEditingName(false); }}
                      style={detailActionBtnStyle}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {detailAsset.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <Pencil size={11} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={detailLabelStyle}>Type</label>
                  <p style={detailValueStyle}>{TYPE_LABELS[detailAsset.type]}</p>
                </div>
                <div>
                  <label style={detailLabelStyle}>Size</label>
                  <p style={detailValueStyle}>{detailAsset.size}</p>
                </div>
                <div>
                  <label style={detailLabelStyle}>Dimensions</label>
                  <p style={detailValueStyle}>{detailAsset.dimensions}</p>
                </div>
                <div>
                  <label style={detailLabelStyle}>Uploaded</label>
                  <p style={detailValueStyle}>{detailAsset.uploadDate}</p>
                </div>
                <div>
                  <label style={detailLabelStyle}>Last used</label>
                  <p style={detailValueStyle}>{detailAsset.lastUsed}</p>
                </div>
                <div>
                  <label style={detailLabelStyle}>Category</label>
                  <p style={detailValueStyle}>{detailAsset.category}</p>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={detailLabelStyle}>Tags</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {detailAsset.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-hover)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => toast.info(`Remove tag: ${tag}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        <X size={8} style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </span>
                  ))}
                  {editingTags ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        value={newTagValue}
                        onChange={(e) => setNewTagValue(e.target.value)}
                        placeholder="New tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagValue.trim()) {
                            toast.success(`Tag added: ${newTagValue.trim()}`);
                            setNewTagValue('');
                            setEditingTags(false);
                          }
                        }}
                        style={{
                          width: 80,
                          background: 'var(--bg-elevated)',
                          border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-pill)',
                          padding: '3px 8px',
                          fontSize: 10,
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingTags(true)}
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        background: 'var(--bg-hover)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        border: '0.5px dashed var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Plus size={9} /> Add
                    </button>
                  )}
                </div>
              </div>

              {/* Rights section */}
              <div>
                <label style={detailLabelStyle}>Rights</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Status</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: RIGHTS_COLORS[detailAsset.rights].bg,
                        color: RIGHTS_COLORS[detailAsset.rights].text,
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {RIGHTS_LABELS[detailAsset.rights]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Source</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{detailAsset.source}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>License</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{detailAsset.license}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Commercial use</span>
                    <span style={{ color: detailAsset.commercialUse ? '#4ade80' : '#f87171' }}>
                      {detailAsset.commercialUse ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage */}
              <div>
                <label style={detailLabelStyle}>Usage ({detailAsset.usedInShots} shots)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                  {(detailAsset.usageRefs ?? []).length === 0 ? (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Not used in any shots</span>
                  ) : (
                    (detailAsset.usageRefs ?? []).map((ref, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ref}</span>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => toast.success('Added to current shot')}
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 0',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Crosshair size={13} /> Use in Shot
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" onClick={() => toast.success('Downloading...')} style={panelSecondaryBtnStyle}>
                    <Download size={12} /> Download
                  </button>
                  <button type="button" onClick={() => { setEditingName(true); }} style={panelSecondaryBtnStyle}>
                    <Pencil size={12} /> Rename
                  </button>
                  <button type="button" onClick={() => toast.info('Move dialog opened')} style={panelSecondaryBtnStyle}>
                    <FolderInput size={12} /> Move
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.error('Delete not available in demo')}
                    style={{ ...panelSecondaryBtnStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Click-away for dropdowns */}
      {(showSortDropdown || showFilterDropdown) && (
        <div
          onClick={() => { setShowSortDropdown(false); setShowFilterDropdown(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
        />
      )}
    </div>
  );
}

// ── Shared inline styles ─────────────────────────────────────────
const bulkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: 11,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
};

const listActionBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-hover)',
  border: '0.5px solid var(--border)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: 0,
  display: 'block',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-primary)',
  margin: '3px 0 0',
};

const detailActionBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-hover)',
  border: '0.5px solid var(--border)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const panelSecondaryBtnStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
  padding: '7px 0',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
};
