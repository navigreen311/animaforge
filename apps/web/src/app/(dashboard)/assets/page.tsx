'use client';

import { useState } from 'react';
import { Upload, Image, Film, Music, Box, Search } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────
type AssetType = 'image' | 'video' | 'audio' | '3d';

interface Asset {
  id: string;
  filename: string;
  type: AssetType;
  size: string;
  meta: string;
  color: string;
}

// ── Sample Data ──────────────────────────────────────────────────
const ASSETS: Asset[] = [
  {
    id: 'asset-1',
    filename: 'hero_pose_v2.png',
    type: 'image',
    size: '2.4 MB',
    meta: '1920\u00d71080',
    color: '#3b82f6',
  },
  {
    id: 'asset-2',
    filename: 'explosion_sfx.wav',
    type: 'audio',
    size: '856 KB',
    meta: '0:03',
    color: '#22c55e',
  },
  {
    id: 'asset-3',
    filename: 'kai_model.glb',
    type: '3d',
    size: '12.8 MB',
    meta: '45K polys',
    color: '#a855f7',
  },
  {
    id: 'asset-4',
    filename: 'background_loop.mp4',
    type: 'video',
    size: '34.2 MB',
    meta: '0:12',
    color: '#f97316',
  },
  {
    id: 'asset-5',
    filename: 'watercolor_texture.png',
    type: 'image',
    size: '5.1 MB',
    meta: '4096\u00d74096',
    color: '#3b82f6',
  },
  {
    id: 'asset-6',
    filename: 'footsteps_gravel.wav',
    type: 'audio',
    size: '1.2 MB',
    meta: '0:08',
    color: '#22c55e',
  },
  {
    id: 'asset-7',
    filename: 'luna_rig.glb',
    type: '3d',
    size: '18.3 MB',
    meta: '62K polys',
    color: '#a855f7',
  },
  {
    id: 'asset-8',
    filename: 'title_animation.mp4',
    type: 'video',
    size: '8.7 MB',
    meta: '0:04',
    color: '#f97316',
  },
];

type FilterTab = 'all' | 'image' | 'video' | 'audio' | '3d';

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: '3D Models', value: '3d' },
];

const TYPE_LABELS: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  '3d': '3D Model',
};

function AssetIcon({ type, size }: { type: AssetType; size: number }) {
  switch (type) {
    case 'image':
      return <Image size={size} style={{ color: 'rgba(255,255,255,0.7)' }} />;
    case 'video':
      return <Film size={size} style={{ color: 'rgba(255,255,255,0.7)' }} />;
    case 'audio':
      return <Music size={size} style={{ color: 'rgba(255,255,255,0.7)' }} />;
    case '3d':
      return <Box size={size} style={{ color: 'rgba(255,255,255,0.7)' }} />;
  }
}

// ── Component ────────────────────────────────────────────────────
export default function AssetsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = ASSETS.filter((a) => {
    const matchesType = activeFilter === 'all' || a.type === activeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      a.filename.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesType && matchesSearch;
  });

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Asset Library
            </h1>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0',
              }}
            >
              2.4 GB / 10 GB used
            </p>
          </div>

          <button
            type="button"
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            <Upload size={13} />
            Upload
          </button>
        </div>

        {/* ── Storage Bar ─────────────────────────────────── */}
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'var(--bg-hover)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '24%',
              height: '100%',
              background: 'var(--brand)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* ── Search + Filter Tabs ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value)}
                style={{
                  background:
                    activeFilter === tab.value ? 'var(--bg-elevated)' : 'transparent',
                  color:
                    activeFilter === tab.value
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  border:
                    activeFilter === tab.value
                      ? '0.5px solid var(--border)'
                      : '0.5px solid transparent',
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: activeFilter === tab.value ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
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
          </div>
        </div>

        {/* ── Asset Grid ──────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {filtered.map((asset) => (
            <div
              key={asset.id}
              onMouseEnter={() => setHoveredCard(asset.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: 'var(--bg-elevated)',
                border:
                  hoveredCard === asset.id
                    ? '0.5px solid var(--border-brand)'
                    : '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
            >
              {/* Colored icon area */}
              <div
                style={{
                  height: 60,
                  background: asset.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AssetIcon type={asset.type} size={24} />
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

                {/* Type badge + size row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-hover)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {TYPE_LABELS[asset.type]}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {asset.size}
                  </span>
                </div>

                {/* Dimensions / duration */}
                <p
                  style={{
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    margin: '6px 0 0',
                  }}
                >
                  {asset.meta}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Empty state ─────────────────────────────────── */}
        {filtered.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: 8,
            }}
          >
            <Search size={24} style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              No assets found
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
