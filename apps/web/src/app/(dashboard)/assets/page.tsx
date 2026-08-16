'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Image,
  Film,
  Music,
  Box,
  Play,
  Pause,
  File as FileIcon,
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
  AlertTriangle,
  Archive,
  RefreshCw,
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
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import WaveformVisualizer from '@/components/ui/WaveformVisualizer';
import UploadModal from '@/components/assets/UploadModal';
import { audioPlayer } from '@/lib/audioPlayer';
import { useResource, mutate } from '@/lib/api/useResource';
import { UnavailableNotice } from '../components/unavailable/UnavailableButton';
import { explainFeature } from '../components/unavailable/featureStatus';

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
  thumbnailUrl?: string;
  url?: string;
  duration?: string;
  polyCount?: string;
  waveformBars?: number[];
  gradient?: string;
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
/** One row of GET /api/assets. */
interface AssetRow {
  id: string;
  projectId: string;
  type: string;
  name: string;
  url: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AssetList {
  items: AssetRow[];
  total: number;
}

const ASSET_TYPE: Record<string, AssetType> = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  model: '3d',
  style_pack: 'style-pack',
};

const ASSET_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #ec4899)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
];

function humanBytes(bytes: unknown): { bytes: number; label: string } {
  if (typeof bytes !== 'number' || bytes <= 0) return { bytes: 0, label: '—' };
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return { bytes, label: `${n.toFixed(1)} ${units[u]}` };
}

/**
 * Map a stored asset to the library tile.
 *
 * The Asset table holds id, project, type, name, url, metadata and createdAt —
 * and nothing else. Everything this tile shows beyond that (size, dimensions,
 * rights, tags, how many shots use it, when it was last used, favourite) has no
 * column. Values present in the metadata blob are used; the rest are left empty
 * or zero rather than populated with plausible-looking detail. Tagging,
 * favouriting and rights tracking need schema before they can work.
 */
function toAsset(row: AssetRow): Asset {
  const meta = row.metadata ?? {};
  const size = humanBytes(meta.size);
  const hash = row.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 13);
  return {
    id: row.id,
    filename: row.name,
    type: ASSET_TYPE[row.type] ?? 'preset',
    sizeBytes: size.bytes,
    size: size.label,
    dimensions: typeof meta.dimensions === 'string' ? meta.dimensions : '—',
    rights: (meta.rights as RightsType) ?? 'ai-generated',
    tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
    usedInShots: 0,
    uploadDate: row.createdAt.slice(0, 10),
    lastUsed: '',
    category: row.type,
    favourite: false,
    color: '#7c3aed',
    thumbnailUrl: row.url,
    url: row.url,
    gradient: ASSET_GRADIENTS[hash % ASSET_GRADIENTS.length],
  };
}

// ── Tag autocomplete suggestions ─────────────────────────────────
const ALL_TAG_SUGGESTIONS = [
  'character',
  'hero',
  'villain',
  'pose',
  'action',
  'background',
  'loop',
  'ambient',
  'texture',
  'watercolor',
  'style',
  'sfx',
  'explosion',
  'footsteps',
  'foley',
  'motion',
  'intro',
  'outro',
  'title',
  '3d',
  'rigged',
  'rig',
  'environment',
  'lighting',
  'shadow',
  'color',
  'grade',
  'cinematic',
  'vfx',
  'particle',
  'dust',
  'smoke',
  'fire',
  'water',
  'wind',
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

// ── "Use in Shot" modal: real projects and shots ────────────
interface ProjectOption {
  id: string;
  title: string;
}
interface ShotOption {
  id: string;
  shotNumber: number;
  prompt: string | null;
  status: string;
}

function shotLabel(s: ShotOption): string {
  const summary = s.prompt?.trim();
  return summary ? `Shot ${s.shotNumber} — ${summary.slice(0, 48)}` : `Shot ${s.shotNumber}`;
}

// ── Category icon helper ─────────────────────────────────────────
function CategoryIcon({ icon }: { icon?: string }) {
  if (icon === 'star') return <Star size={12} style={{ color: '#fbbf24' }} />;
  if (icon === 'clock') return <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />;
  if (icon === 'alert') return <AlertCircle size={12} style={{ color: 'var(--text-tertiary)' }} />;
  return null;
}

// ── Asset Thumbnail (type-aware) ────────────────────────────────
function AssetThumbnail({ asset, height = 72 }: { asset: Asset; height?: number }) {
  const bg = asset.gradient ?? asset.color;
  if (asset.type === 'image') {
    return (
      <div
        style={{ width: '100%', height, background: bg, position: 'relative', overflow: 'hidden' }}
      >
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnailUrl}
            alt={asset.filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Image size={28} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>
        )}
      </div>
    );
  }
  if (asset.type === 'video') {
    return (
      <div
        style={{ width: '100%', height, background: bg, position: 'relative', overflow: 'hidden' }}
      >
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnailUrl}
            alt={asset.filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Film size={28} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid rgba(255,255,255,0.25)',
            }}
          >
            <Play size={14} style={{ color: '#fff', marginLeft: 2 }} fill="#fff" />
          </div>
        </div>
        {asset.duration && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {asset.duration}
          </div>
        )}
      </div>
    );
  }
  if (asset.type === 'audio') {
    const bars = asset.waveformBars ?? [0.3, 0.6, 1, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.3, 0.5, 0.8];
    return (
      <div
        style={{
          width: '100%',
          height,
          background: bg,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
        <div style={{ width: '100%' }}>
          <WaveformVisualizer
            trackId={asset.id}
            staticData={bars}
            isPlaying={false}
            progress={0}
            height={40}
            color="rgba(255,255,255,0.9)"
          />
        </div>
        {asset.duration && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {asset.duration}
          </div>
        )}
      </div>
    );
  }
  if (asset.type === '3d') {
    return (
      <div
        style={{
          width: '100%',
          height,
          background: bg,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnailUrl}
            alt={asset.filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box size={32} style={{ color: 'rgba(255,255,255,0.85)' }} />
        )}
        {asset.polyCount && (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {asset.polyCount} polys
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {asset.type === 'style-pack' ? (
        <Palette size={28} style={{ color: 'rgba(255,255,255,0.85)' }} />
      ) : asset.type === 'preset' ? (
        <Sliders size={28} style={{ color: 'rgba(255,255,255,0.85)' }} />
      ) : (
        <FileIcon size={28} style={{ color: 'rgba(255,255,255,0.7)' }} />
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function AssetsPage() {
  const assetState = useResource<AssetList>('/api/assets?limit=200');


  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Presign, PUT to storage, then record the asset.
   *
   * All three steps persist: POST /api/upload/presign, the storage PUT, and
   * POST /api/assets, with the asset read back after a platform-api restart
   * (run 31925346146). Each failure is reported where it happens rather than
   * collapsed into one "upload failed", because the recovery differs.
   */
  const uploadAsset = async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      const presign = await mutate<{ data?: { uploadUrl?: string; publicUrl?: string } }>(
        '/api/upload/presign',
        'POST',
        { filename: file.name, contentType: file.type || 'application/octet-stream' },
      );
      if (presign.error) throw new Error(presign.error.message);

      const payload = presign.data as { data?: { uploadUrl?: string; publicUrl?: string } } | null;
      const uploadUrl = payload?.data?.uploadUrl;
      if (!uploadUrl) throw new Error('The presign response carried no upload URL.');

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(`Storage rejected the upload (HTTP ${put.status}).`);

      const record = await mutate('/api/assets', 'POST', {
        name: file.name,
        type: file.type.startsWith('audio') ? 'audio' : 'image',
        url: payload?.data?.publicUrl ?? uploadUrl.split('?')[0],
      });
      if (record.error) {
        throw new Error(
          `The file uploaded but was not recorded: ${record.error.message}. It will not appear in this list.`,
        );
      }

      assetState.reload();
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadBusy(false);
    }
  };  const projectState = useResource<{ items: ProjectOption[] }>('/api/projects?limit=100');
  const projectOptions = projectState.data?.items ?? [];
  const assets = useMemo(() => (assetState.data?.items ?? []).map(toAsset), [assetState.data]);
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingTags, setEditingTags] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [assetTagsOverride, setAssetTagsOverride] = useState<Record<string, string[]>>({});
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  // AL-3: Use in Shot modal state
  const [showUseShotModal, setShowUseShotModal] = useState(false);
  const [useShotProjectId, setUseShotProjectId] = useState<string | null>(null);
  const shotState = useResource<{ items: ShotOption[] }>(
    useShotProjectId ? `/api/projects/${useShotProjectId}/shots` : null,
    [useShotProjectId],
  );
  const shotOptions = shotState.data?.items ?? [];

  const [useShotShotId, setUseShotShotId] = useState<string | null>(null);

  // AL-4: Audio preview play/pause state (for detail panel)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const editNameInputRef = useRef<HTMLInputElement | null>(null);

  // Rights filter checkboxes
  const [rightsFilters, setRightsFilters] = useState<Set<RightsType>>(new Set());
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  // Computed
  const detailAsset = detailAssetId ? (assets.find((a) => a.id === detailAssetId) ?? null) : null;

  const activeFilters = useMemo(() => {
    const pills: { label: string; key: string }[] = [];
    rightsFilters.forEach((r) => pills.push({ label: RIGHTS_LABELS[r], key: `rights-${r}` }));
    if (usageFilter !== 'all')
      pills.push({
        label: usageFilter === 'used' ? 'Used' : 'Unused',
        key: `usage-${usageFilter}`,
      });
    return pills;
  }, [rightsFilters, usageFilter]);

  const removeFilter = useCallback((key: string) => {
    if (key.startsWith('rights-')) {
      const r = key.replace('rights-', '') as RightsType;
      setRightsFilters((prev) => {
        const next = new Set(prev);
        next.delete(r);
        return next;
      });
    } else if (key.startsWith('usage-')) {
      setUsageFilter('all');
    }
  }, []);

  const filtered = useMemo(() => {
    const result = assets.filter((a) => {
      if (activeTab !== 'all' && a.type !== activeTab) return false;
      if (activeCategory && a.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!a.filename.toLowerCase().includes(q) && !a.tags.some((t) => t.includes(q)))
          return false;
      }
      if (rightsFilters.size > 0 && !rightsFilters.has(a.rights)) return false;
      if (usageFilter === 'used' && a.usedInShots === 0) return false;
      if (usageFilter === 'unused' && a.usedInShots > 0) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.filename.localeCompare(b.filename);
        case 'name-desc':
          return b.filename.localeCompare(a.filename);
        case 'date-newest':
          return b.uploadDate.localeCompare(a.uploadDate);
        case 'date-oldest':
          return a.uploadDate.localeCompare(b.uploadDate);
        case 'size-largest':
          return b.sizeBytes - a.sizeBytes;
        case 'size-smallest':
          return a.sizeBytes - b.sizeBytes;
        case 'most-used':
          return b.usedInShots - a.usedInShots;
        case 'least-used':
          return a.usedInShots - b.usedInShots;
        default:
          return 0;
      }
    });

    return result;
  }, [activeTab, activeCategory, searchQuery, sortBy, rightsFilters, usageFilter]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // AL-3: Open Use in Shot modal
  const openUseShotModal = useCallback(() => {
    setUseShotProjectId(null);
    setUseShotShotId(null);
    setShowUseShotModal(true);
  }, []);

  // AL-3: Mock link asset to shot
  const handleLinkToShot = useCallback(async () => {
    if (!detailAsset || !useShotProjectId || !useShotShotId) return;
    const project = projectOptions.find((p) => p.id === useShotProjectId);
    // The pickers above are real, but the link itself has nowhere to go:
    // there is no asset-to-shot join table and no column on Shot that holds an
    // asset id. This used to sleep 300ms and claim the link was made.
    toast.error(
      `Linking an asset to a shot in ${
        project?.title ?? 'this project'
      } cannot be saved — the schema has no asset-to-shot relation yet.`,
    );
  }, [detailAsset, useShotProjectId, useShotShotId, projectOptions]);

  // AL-5: Commit rename
  const commitRename = useCallback(async () => {
    if (!detailAsset) return;
    const next = editNameValue.trim();
    if (!next || next === detailAsset.filename) {
      setEditingName(false);
      setEditNameValue(detailAsset.filename);
      return;
    }
    // Mock API call
    await new Promise((r) => setTimeout(r, 200));
    // Mutate in-memory mock so the UI reflects the change immediately.
    // Renaming mutated the module-level array in place, so it survived until
    // the next navigation and no further. There is no rename endpoint on
    // assets, so this reports that rather than pretending.
    toast.error('Renaming an asset is not wired up yet.');
    toast.success(`Renamed to ${next}`);
    setEditingName(false);
  }, [detailAsset, editNameValue]);

  const cancelRename = useCallback(() => {
    if (detailAsset) setEditNameValue(detailAsset.filename);
    setEditingName(false);
  }, [detailAsset]);

  // AL-5: Download handler
  const handleDownload = useCallback(async (asset: Asset) => {
    // Mock API call returns a downloadUrl
    await new Promise((r) => setTimeout(r, 150));
    const downloadUrl =
      asset.url ??
      asset.thumbnailUrl ??
      `https://assets.animaforge.mock/${asset.id}/${encodeURIComponent(asset.filename)}`;
    try {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = asset.filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ignore — mock environment
    }
    toast.success(`Downloading ${asset.filename}`);
  }, []);

  // AL-4: Toggle audio preview playback in detail panel
  const toggleAudioPreview = useCallback(
    async (asset: Asset) => {
      const url = asset.url ?? `/mock-audio/${asset.id}.wav`;
      if (playingAudioId === asset.id) {
        audioPlayer.stop();
        setPlayingAudioId(null);
        return;
      }
      try {
        await audioPlayer.play(asset.id, url, undefined, () => setPlayingAudioId(null));
        setPlayingAudioId(asset.id);
      } catch {
        // Web Audio likely cannot fetch the mock url — still reflect play state briefly
        toast.info('Audio preview unavailable in demo');
      }
    },
    [playingAudioId],
  );

  // Focus the rename input when entering edit mode
  useEffect(() => {
    if (editingName && editNameInputRef.current) {
      editNameInputRef.current.focus();
      editNameInputRef.current.select();
    }
  }, [editingName]);

  // Stop any audio preview when the detail panel closes
  useEffect(() => {
    if (!detailAssetId && playingAudioId) {
      audioPlayer.stop();
      setPlayingAudioId(null);
    }
  }, [detailAssetId, playingAudioId]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div
        style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      >
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
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1
                  style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
                >
                  Asset Library
                </h1>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
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
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isStorageWarning ? '#f97316' : 'var(--text-secondary)',
                    }}
                  >
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
                      <div
                        style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }}
                      />
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
          <div
            style={{
              display: 'flex',
              gap: 4,
              borderBottom: '0.5px solid var(--border)',
              paddingBottom: 8,
            }}
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setActiveCategory(null);
                }}
                style={{
                  background: activeTab === tab.value ? 'var(--bg-elevated)' : 'transparent',
                  color: activeTab === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                    color:
                      activeCategory === null ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                      color:
                        activeCategory === cat.label
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
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
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}
            >
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
                    type="search"
                    aria-label="Search assets"
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
                      aria-label="Clear search"
                      onClick={() => setSearchQuery('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      <X size={12} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSortDropdown(!showSortDropdown);
                      setShowFilterDropdown(false);
                    }}
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
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortDropdown(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            background: sortBy === opt.value ? 'var(--bg-active)' : 'transparent',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: 11,
                            color:
                              sortBy === opt.value
                                ? 'var(--text-primary)'
                                : 'var(--text-secondary)',
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
                    onClick={() => {
                      setShowFilterDropdown(!showFilterDropdown);
                      setShowSortDropdown(false);
                    }}
                    style={{
                      background:
                        activeFilters.length > 0 ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                      border:
                        activeFilters.length > 0
                          ? '0.5px solid var(--brand-border)'
                          : '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '5px 10px',
                      fontSize: 11,
                      color:
                        activeFilters.length > 0 ? 'var(--text-brand)' : 'var(--text-secondary)',
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
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          margin: '0 0 6px',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        Rights
                      </p>
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
                                if (next.has(r)) next.delete(r);
                                else next.add(r);
                                return next;
                              });
                            }}
                            style={{ accentColor: 'var(--brand)' }}
                          />
                          {RIGHTS_LABELS[r]}
                        </label>
                      ))}
                      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          margin: '0 0 6px',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        Usage
                      </p>
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
                    <LayoutGrid
                      size={13}
                      style={{
                        color: viewMode === 'grid' ? 'var(--text-brand)' : 'var(--text-tertiary)',
                      }}
                    />
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
                    <List
                      size={13}
                      style={{
                        color: viewMode === 'list' ? 'var(--text-brand)' : 'var(--text-tertiary)',
                      }}
                    />
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
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
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
                    {selectedIds.size} asset{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <button type="button" onClick={selectAll} style={bulkBtnStyle}>
                    Select all ({filtered.length})
                  </button>
                  <button type="button" onClick={clearSelection} style={bulkBtnStyle}>
                    Clear
                  </button>
                  <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(
                        `Preparing ZIP of ${selectedIds.size} asset${selectedIds.size !== 1 ? 's' : ''}...`,
                      )
                    }
                    style={bulkBtnStyle}
                  >
                    <Download size={11} /> Download (ZIP)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        `Move ${selectedIds.size} asset${selectedIds.size !== 1 ? 's' : ''} to...`,
                      )
                    }
                    style={bulkBtnStyle}
                  >
                    <FolderInput size={11} /> Move to...
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(
                        `Deleted ${selectedIds.size} asset${selectedIds.size !== 1 ? 's' : ''}`,
                      );
                      clearSelection();
                    }}
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
                    const isExpired = asset.rights === 'expired';

                    return (
                      <div
                        key={asset.id}
                        onMouseEnter={() => setHoveredCard(asset.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => openDetail(asset)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: isExpired
                            ? '1px solid #f97316'
                            : isHovered
                              ? '0.5px solid var(--border-brand)'
                              : isSelected
                                ? '0.5px solid var(--brand-border)'
                                : '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'border-color 150ms ease',
                          position: 'relative',
                          boxShadow: isExpired ? '0 0 0 1px rgba(249,115,22,0.25)' : undefined,
                        }}
                      >
                        {/* Expired rights badge */}
                        {isExpired && (
                          <div
                            title="Rights expired — commercial use not permitted"
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              zIndex: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              background: 'rgba(249,115,22,0.92)',
                              color: '#fff',
                              padding: '3px 7px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 9,
                              fontWeight: 600,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                            }}
                          >
                            <AlertTriangle size={10} />
                            Rights expired
                          </div>
                        )}
                        {/* Checkbox */}
                        {showCheckbox && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(asset.id);
                            }}
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
                        <div style={{ position: 'relative' }}>
                          <AssetThumbnail asset={asset} height={72} />

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
                                {
                                  icon: <Eye size={12} />,
                                  label: 'Preview',
                                  action: () => toast.info(`Preview: ${asset.filename}`),
                                },
                                {
                                  icon: <Crosshair size={12} />,
                                  label: 'Use in Shot',
                                  action: () => toast.success('Added to current shot'),
                                },
                                {
                                  icon: <Download size={12} />,
                                  label: 'Download',
                                  action: () => toast.success('Downloading...'),
                                },
                                {
                                  icon: <MoreHorizontal size={12} />,
                                  label: 'More',
                                  action: () => openDetail(asset),
                                },
                              ].map((btn) => (
                                <button
                                  key={btn.label}
                                  type="button"
                                  title={btn.label}
                                  aria-label={btn.label}
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
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 6,
                              flexWrap: 'wrap',
                            }}
                          >
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
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                              {asset.size}
                            </span>
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
                          <p
                            style={{
                              fontSize: 10,
                              color: 'var(--text-tertiary)',
                              margin: '5px 0 0',
                            }}
                          >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(asset.id);
                          }}
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
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {asset.size}
                        </span>

                        {/* Dimensions */}
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {asset.dimensions}
                        </span>

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
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {asset.usedInShots} shots
                        </span>

                        {/* Uploaded */}
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {asset.uploadDate}
                        </span>

                        {/* Actions */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: 'flex', gap: 4 }}
                        >
                          <button
                            type="button"
                            title="Preview"
                            aria-label="Preview"
                            onClick={() => toast.info(`Preview: ${asset.filename}`)}
                            style={listActionBtnStyle}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            title="Download"
                            aria-label="Download"
                            onClick={() => toast.success('Downloading...')}
                            style={listActionBtnStyle}
                          >
                            <Download size={12} />
                          </button>
                          <button
                            type="button"
                            title="More"
                            aria-label="More options"
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

              {/* ── Loading / error / empty ─────────────────── */}
              {/* A failed load is not an empty library. It used to render the
                  same "No assets found" card either way, which is how a broken
                  fetch passed for a finished screen. */}
              {assetState.loading && <LoadingState label="Loading assets" />}
              {!assetState.loading && assetState.error && (
                <ErrorState error={assetState.error} onRetry={assetState.reload} />
              )}
              {!assetState.loading && !assetState.error && filtered.length === 0 && (
                <EmptyState
                  icon={Package}
                  title="No assets found"
                  description="Try adjusting your filters or search query."
                />
              )}
              {!assetState.loading && !assetState.error && filtered.length === 0 && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <label
                    htmlFor="asset-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                      cursor: uploadBusy ? 'progress' : 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <input
                      id="asset-upload"
                      type="file"
                      disabled={uploadBusy}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadAsset(file);
                        e.target.value = '';
                      }}
                    />
                    <Upload size={13} />
                    {uploadBusy ? 'Uploading…' : 'Upload an asset'}
                  </label>
                </div>
              )}
              {uploadError && (
                <p
                  role="alert"
                  style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#ef4444' }}
                >
                  {uploadError}
                </p>
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
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Asset Details
                </span>
                <button
                  type="button"
                  aria-label="Close details"
                  onClick={() => setDetailAssetId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Expired rights banner */}
              {detailAsset.rights === 'expired' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'rgba(249,115,22,0.12)',
                    borderBottom: '0.5px solid rgba(249,115,22,0.35)',
                    color: '#fb923c',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>Rights expired — commercial use not permitted</span>
                </div>
              )}

              {/* AL-4: Large preview (type-specific) */}
              <div
                style={{
                  height: 180,
                  background: detailAsset.gradient ?? detailAsset.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {detailAsset.type === 'image' ? (
                  detailAsset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detailAsset.thumbnailUrl}
                      alt={detailAsset.filename}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <AssetIcon type="image" size={48} />
                  )
                ) : detailAsset.type === 'video' ? (
                  detailAsset.url ? (
                    <video
                      src={detailAsset.url}
                      poster={detailAsset.thumbnailUrl}
                      controls
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        background: '#000',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {detailAsset.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detailAsset.thumbnailUrl}
                          alt={detailAsset.filename}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'relative',
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Play size={20} style={{ color: '#fff', marginLeft: 2 }} />
                      </div>
                    </div>
                  )
                ) : detailAsset.type === 'audio' ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '0 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <WaveformVisualizer
                      progress={0}
                      trackId={detailAsset.id}
                      staticData={
                        detailAsset.waveformBars ?? [
                          0.3, 0.6, 1, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.3, 0.8, 0.5, 0.7, 0.4, 0.9,
                          0.6, 0.3, 0.8, 0.5, 0.7,
                        ]
                      }
                      isPlaying={playingAudioId === detailAsset.id}
                      height={80}
                      color="#fff"
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAudioPreview(detailAsset);
                        }}
                        aria-label={
                          playingAudioId === detailAsset.id ? 'Pause preview' : 'Play preview'
                        }
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)',
                          border: '0.5px solid rgba(255,255,255,0.25)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {playingAudioId === detailAsset.id ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} style={{ marginLeft: 2 }} />
                        )}
                      </button>
                      <span
                        style={{ fontSize: 11, color: '#fff', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {detailAsset.duration ?? detailAsset.dimensions}
                      </span>
                    </div>
                  </div>
                ) : detailAsset.type === '3d' ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      position: 'relative',
                    }}
                  >
                    {detailAsset.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detailAsset.thumbnailUrl}
                        alt={detailAsset.filename}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.6,
                        }}
                      />
                    ) : (
                      <Box
                        size={48}
                        style={{ color: 'rgba(255,255,255,0.85)', position: 'relative' }}
                      />
                    )}
                    <span
                      style={{
                        position: 'relative',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.95)',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      title={explainFeature('assets.preview3d')}
                    >
                      No 3D viewer built
                    </span>
                  </div>
                ) : (
                  <AssetIcon type={detailAsset.type} size={48} />
                )}
              </div>

              {/* Metadata */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* AL-5: Editable name (click name / Rename button, blur saves, Enter saves, Escape cancels) */}
                <div>
                  <label style={detailLabelStyle}>Name</label>
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        ref={editNameInputRef}
                        type="text"
                        aria-label="Asset name"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
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
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={commitRename}
                        title="Save (Enter)"
                        aria-label="Save"
                        style={{
                          ...detailActionBtnStyle,
                          background: 'var(--brand)',
                          color: '#fff',
                        }}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={cancelRename}
                        title="Cancel (Esc)"
                        aria-label="Cancel"
                        style={detailActionBtnStyle}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        onClick={() => {
                          setEditNameValue(detailAsset.filename);
                          setEditingName(true);
                        }}
                        title="Click to rename"
                        style={{
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          wordBreak: 'break-all',
                          cursor: 'pointer',
                        }}
                      >
                        {detailAsset.filename}
                      </span>
                      <button
                        type="button"
                        aria-label="Rename"
                        onClick={() => {
                          setEditNameValue(detailAsset.filename);
                          setEditingName(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
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

                {/* Tags (AL-8: inline input with autocomplete) */}
                {(() => {
                  const effectiveTags = assetTagsOverride[detailAsset.id] ?? detailAsset.tags;
                  const trimmed = newTagValue.trim().toLowerCase();
                  const suggestions = trimmed
                    ? ALL_TAG_SUGGESTIONS.filter(
                        (t) => t.toLowerCase().includes(trimmed) && !effectiveTags.includes(t),
                      ).slice(0, 6)
                    : [];
                  const addTag = (tag: string) => {
                    const clean = tag.trim();
                    if (!clean) return;
                    if (effectiveTags.includes(clean)) {
                      toast.info(`Tag "${clean}" already exists`);
                    } else {
                      setAssetTagsOverride((prev) => ({
                        ...prev,
                        [detailAsset.id]: [...effectiveTags, clean],
                      }));
                      toast.success(`Tag added: ${clean}`);
                    }
                    setNewTagValue('');
                    setTimeout(() => tagInputRef.current?.focus(), 0);
                  };
                  const removeTag = (tag: string) => {
                    setAssetTagsOverride((prev) => ({
                      ...prev,
                      [detailAsset.id]: effectiveTags.filter((t) => t !== tag),
                    }));
                    toast.success(`Tag removed: ${tag}`);
                  };
                  const cancelEditing = () => {
                    setNewTagValue('');
                    setEditingTags(false);
                  };
                  return (
                    <div>
                      <label style={detailLabelStyle}>Tags</label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {effectiveTags.map((tag) => (
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
                              onClick={() => removeTag(tag)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                              }}
                            >
                              <X size={8} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                          </span>
                        ))}
                        {editingTags ? (
                          <div style={{ position: 'relative' }}>
                            <input
                              ref={tagInputRef}
                              type="text"
                              aria-label="Add tag"
                              value={newTagValue}
                              onChange={(e) => setNewTagValue(e.target.value)}
                              placeholder="Type tag..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newTagValue.trim()) addTag(newTagValue);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEditing();
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  if (document.activeElement !== tagInputRef.current) {
                                    cancelEditing();
                                  }
                                }, 120);
                              }}
                              style={{
                                width: 120,
                                background: 'var(--bg-elevated)',
                                border: '0.5px solid var(--brand-border)',
                                borderRadius: 'var(--radius-pill)',
                                padding: '3px 8px',
                                fontSize: 10,
                                color: 'var(--text-primary)',
                                outline: 'none',
                              }}
                              autoFocus
                            />
                            {suggestions.length > 0 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  left: 0,
                                  minWidth: 140,
                                  background: 'var(--bg-overlay)',
                                  border: '0.5px solid var(--border)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: 4,
                                  zIndex: 40,
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2,
                                }}
                              >
                                {suggestions.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      addTag(s);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text-secondary)',
                                      fontSize: 11,
                                      textAlign: 'left',
                                      padding: '4px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background =
                                        'var(--bg-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background =
                                        'transparent';
                                    }}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTags(true);
                              setNewTagValue('');
                            }}
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
                  );
                })()}

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
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Not used in any shots
                      </span>
                    ) : (
                      (detailAsset.usageRefs ?? []).map((ref, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {ref}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    disabled={detailAsset.rights === 'expired'}
                    title={
                      detailAsset.rights === 'expired'
                        ? 'Rights expired — renew the license before using this asset in a shot'
                        : undefined
                    }
                    onClick={() => {
                      if (detailAsset.rights === 'expired') return;
                      openUseShotModal();
                    }}
                    style={{
                      background:
                        detailAsset.rights === 'expired' ? 'var(--bg-hover)' : 'var(--brand)',
                      color: detailAsset.rights === 'expired' ? 'var(--text-tertiary)' : '#fff',
                      border: 'none',
                      padding: '8px 0',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: detailAsset.rights === 'expired' ? 'not-allowed' : 'pointer',
                      opacity: detailAsset.rights === 'expired' ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Crosshair size={13} /> Use in Shot
                  </button>

                  {detailAsset.rights === 'expired' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => toast.success('Opening rights renewal...')}
                        style={{
                          background: 'rgba(249,115,22,0.15)',
                          color: '#fb923c',
                          border: '0.5px solid rgba(249,115,22,0.4)',
                          padding: '7px 0',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}
                      >
                        <RefreshCw size={12} /> Renew rights
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success(`Removed ${detailAsset.filename}`)}
                        style={{
                          ...panelSecondaryBtnStyle,
                          color: '#f87171',
                          borderColor: 'rgba(248,113,113,0.3)',
                        }}
                      >
                        <Trash2 size={12} /> Remove asset
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleDownload(detailAsset)}
                      style={panelSecondaryBtnStyle}
                    >
                      <Download size={12} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditNameValue(detailAsset.filename);
                        setEditingName(true);
                      }}
                      style={panelSecondaryBtnStyle}
                    >
                      <Pencil size={12} /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Move dialog opened')}
                      style={panelSecondaryBtnStyle}
                    >
                      <FolderInput size={12} /> Move
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.error('Delete not available in demo')}
                      style={{
                        ...panelSecondaryBtnStyle,
                        color: '#f87171',
                        borderColor: 'rgba(248,113,113,0.2)',
                      }}
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
            onClick={() => {
              setShowSortDropdown(false);
              setShowFilterDropdown(false);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
        )}

        {/* AL-3: Use in Shot modal */}
        {showUseShotModal && detailAsset && (
          <div
            onClick={() => setShowUseShotModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Use asset in shot"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Use in Shot
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 340,
                    }}
                  >
                    {detailAsset.filename}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUseShotModal(false)}
                  aria-label="Close"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <X size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Project picker */}
                <div>
                  <label style={detailLabelStyle}>Project</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {projectOptions.map((p) => {
                      const active = useShotProjectId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setUseShotProjectId(p.id);
                            setUseShotShotId(null);
                          }}
                          style={{
                            textAlign: 'left',
                            background: active
                              ? 'var(--brand-subtle, rgba(99,102,241,0.12))'
                              : 'var(--bg-elevated)',
                            border: active
                              ? '0.5px solid var(--brand)'
                              : '0.5px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px 12px',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{p.title}</span>
                          {active && <Check size={12} style={{ color: 'var(--brand)' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shot selector — only after a project is chosen */}
                {useShotProjectId && (
                  <div>
                    <label style={detailLabelStyle}>Shot</label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        marginTop: 6,
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 4,
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      {shotOptions.map((s) => {
                        const active = useShotShotId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setUseShotShotId(s.id)}
                            style={{
                              textAlign: 'left',
                              background: active
                                ? 'var(--brand-subtle, rgba(99,102,241,0.18))'
                                : 'transparent',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              padding: '7px 10px',
                              fontSize: 12,
                              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>{shotLabel(s)}</span>
                            {active && <Check size={12} style={{ color: 'var(--brand)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: '12px 18px',
                  borderTop: '0.5px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUseShotModal(false)}
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '0.5px solid var(--border)',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!useShotProjectId || !useShotShotId}
                  onClick={handleLinkToShot}
                  style={{
                    background:
                      !useShotProjectId || !useShotShotId ? 'var(--bg-hover)' : 'var(--brand)',
                    color: !useShotProjectId || !useShotShotId ? 'var(--text-tertiary)' : '#fff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: !useShotProjectId || !useShotShotId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Crosshair size={12} /> Link to Shot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <UploadModal open={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </ErrorBoundary>
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
