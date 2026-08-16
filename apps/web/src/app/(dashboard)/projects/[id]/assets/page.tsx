'use client';

import { useState, useMemo } from 'react';
import { useResource } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import { useParams } from 'next/navigation';

type AssetType = 'all' | 'images' | 'videos' | 'audio' | 'models';

interface Asset {
  id: string;
  name: string;
  type: 'images' | 'videos' | 'audio' | 'models';
  size: string;
  dimensions?: string;
  duration?: string;
  uploadedAt: string;
  thumbnail: string;
}

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

/** The stored `type` is singular; this screen groups by plural buckets. */
const TYPE_BUCKET: Record<string, Asset['type']> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  model: 'models',
  style_pack: 'models',
};

function formatBytes(bytes: unknown): string {
  if (typeof bytes !== 'number' || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return `${n.toFixed(1)} ${units[u]}`;
}

/**
 * Map an asset row to the tile.
 *
 * Size, dimensions and duration live in the metadata blob when the uploader
 * recorded them; there are no columns for them, so an asset without metadata
 * shows a dash rather than a plausible file size. The thumbnail is the asset's
 * own URL — there is no separate thumbnail pipeline.
 */
function toAsset(row: AssetRow): Asset {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    type: TYPE_BUCKET[row.type] ?? 'models',
    name: row.name,
    size: formatBytes(meta.size),
    dimensions: typeof meta.dimensions === 'string' ? meta.dimensions : undefined,
    duration: typeof meta.duration === 'string' ? meta.duration : undefined,
    uploadedAt: row.createdAt.slice(0, 10),
    thumbnail: row.url,
  };
}

const TYPE_TABS: { value: AssetType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'models', label: 'Models' },
];

const TYPE_ICONS: Record<Asset['type'], string> = {
  images:
    'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  videos:
    'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  audio:
    'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
  models:
    'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
};

const TYPE_COLORS: Record<Asset['type'], string> = {
  images: 'text-blue-400 bg-blue-900/30',
  videos: 'text-purple-400 bg-purple-900/30',
  audio: 'text-green-400 bg-green-900/30',
  models: 'text-orange-400 bg-orange-900/30',
};

export default function AssetsPage() {
  const params = useParams<{ id: string }>();
  const [activeType, setActiveType] = useState<AssetType>('all');
  const [search, setSearch] = useState('');

  const state = useResource<AssetList>(`/api/assets?projectId=${params.id}`, [params.id]);
  const assets = useMemo(() => (state.data?.items ?? []).map(toAsset), [state.data]);

  const filtered = assets.filter((asset) => {
    const matchesType = activeType === 'all' || asset.type === activeType;
    const matchesSearch = search === '' || asset.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const typeCounts = assets.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Asset Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Project {params.id} &mdash; {assets.length} assets
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Asset
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search assets by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-6">
        {TYPE_TABS.map((tab) => {
          const count = tab.value === 'all' ? assets.length : typeCounts[tab.value] || 0;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveType(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeType === tab.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="group rounded-xl border border-gray-800 bg-gray-900 overflow-hidden hover:border-gray-700 transition-colors"
          >
            {/* Thumbnail placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className={`p-3 rounded-xl ${TYPE_COLORS[asset.type]}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={TYPE_ICONS[asset.type]}
                  />
                </svg>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Preview"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Download"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 bg-gray-800 rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-200 truncate" title={asset.name}>
                {asset.name}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span>{asset.size}</span>
                {asset.dimensions && <span>{asset.dimensions}</span>}
                {asset.duration && <span>{asset.duration}</span>}
                <span className="ml-auto">{asset.uploadedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="w-10 h-10 text-gray-700 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">No assets match your search.</p>
        </div>
      )}
    </div>
  );
}
