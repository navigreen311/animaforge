'use client';

import { useState } from 'react';
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

const MOCK_ASSETS: Asset[] = [
  { id: 'a1', name: 'hero_pose_front.png', type: 'images', size: '2.4 MB', dimensions: '2048x2048', uploadedAt: '2026-03-24', thumbnail: '/assets/thumb-1.webp' },
  { id: 'a2', name: 'city_establishing.mp4', type: 'videos', size: '48.2 MB', duration: '0:12', uploadedAt: '2026-03-24', thumbnail: '/assets/thumb-2.webp' },
  { id: 'a3', name: 'ambient_rain.wav', type: 'audio', size: '8.1 MB', duration: '1:30', uploadedAt: '2026-03-23', thumbnail: '/assets/thumb-3.webp' },
  { id: 'a4', name: 'katana_model.glb', type: 'models', size: '12.7 MB', uploadedAt: '2026-03-23', thumbnail: '/assets/thumb-4.webp' },
  { id: 'a5', name: 'neon_alley_bg.png', type: 'images', size: '5.1 MB', dimensions: '4096x2160', uploadedAt: '2026-03-22', thumbnail: '/assets/thumb-5.webp' },
  { id: 'a6', name: 'sword_clash.wav', type: 'audio', size: '1.2 MB', duration: '0:03', uploadedAt: '2026-03-22', thumbnail: '/assets/thumb-6.webp' },
  { id: 'a7', name: 'chase_sequence.mp4', type: 'videos', size: '124.5 MB', duration: '0:45', uploadedAt: '2026-03-21', thumbnail: '/assets/thumb-7.webp' },
  { id: 'a8', name: 'character_turntable.glb', type: 'models', size: '34.2 MB', uploadedAt: '2026-03-21', thumbnail: '/assets/thumb-8.webp' },
  { id: 'a9', name: 'explosion_ref.png', type: 'images', size: '1.8 MB', dimensions: '1920x1080', uploadedAt: '2026-03-20', thumbnail: '/assets/thumb-9.webp' },
  { id: 'a10', name: 'dramatic_score.wav', type: 'audio', size: '22.4 MB', duration: '3:15', uploadedAt: '2026-03-20', thumbnail: '/assets/thumb-10.webp' },
  { id: 'a11', name: 'rooftop_pan.mp4', type: 'videos', size: '67.8 MB', duration: '0:22', uploadedAt: '2026-03-19', thumbnail: '/assets/thumb-11.webp' },
  { id: 'a12', name: 'drone_model.glb', type: 'models', size: '8.9 MB', uploadedAt: '2026-03-19', thumbnail: '/assets/thumb-12.webp' },
];

const TYPE_TABS: { value: AssetType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'models', label: 'Models' },
];

const TYPE_ICONS: Record<Asset['type'], string> = {
  images: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  videos: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  audio: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
  models: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
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

  const filtered = MOCK_ASSETS.filter((asset) => {
    const matchesType = activeType === 'all' || asset.type === activeType;
    const matchesSearch =
      search === '' ||
      asset.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const typeCounts = MOCK_ASSETS.reduce(
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
            Project {params.id} &mdash; {MOCK_ASSETS.length} assets
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
          const count =
            tab.value === 'all'
              ? MOCK_ASSETS.length
              : typeCounts[tab.value] || 0;
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={TYPE_ICONS[asset.type]} />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Download"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 bg-gray-800 rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">No assets match your search.</p>
        </div>
      )}
    </div>
  );
}
