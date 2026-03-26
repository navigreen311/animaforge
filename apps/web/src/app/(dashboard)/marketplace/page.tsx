'use client';

import { useState } from 'react';
import { Store, Search, Download, Star } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type Category = 'all' | 'style-packs' | 'templates' | 'characters' | 'audio';

interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  categorySlug: Category;
  creator: string;
  price: number | null; // null = free
  metric: string; // e.g. "1.2K clones"
  gradient: string;
}

// ── Sample Data ──────────────────────────────────────────────
const CATEGORY_TABS: { label: string; value: Category }[] = [
  { label: 'All', value: 'all' },
  { label: 'Style Packs', value: 'style-packs' },
  { label: 'Templates', value: 'templates' },
  { label: 'Characters', value: 'characters' },
  { label: 'Audio', value: 'audio' },
];

const ITEMS: MarketplaceItem[] = [
  {
    id: 'mp-1',
    name: 'Watercolor Dream',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'ArtBot',
    price: null,
    metric: '1.2K clones',
    gradient: 'linear-gradient(135deg, #6366f1, #06b6d4)',
  },
  {
    id: 'mp-2',
    name: 'Anime Classic',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'StyleMaster',
    price: 50,
    metric: '890 clones',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  },
  {
    id: 'mp-3',
    name: 'Hero Template',
    category: 'Template',
    categorySlug: 'templates',
    creator: 'AnimaForge',
    price: null,
    metric: '3.4K uses',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    id: 'mp-4',
    name: 'Villain Pack',
    category: 'Characters',
    categorySlug: 'characters',
    creator: 'CharacterLab',
    price: 120,
    metric: '450 clones',
    gradient: 'linear-gradient(135deg, #10b981, #065f46)',
  },
  {
    id: 'mp-5',
    name: 'Cinematic Score',
    category: 'Audio',
    categorySlug: 'audio',
    creator: 'SoundForge',
    price: 80,
    metric: '670 downloads',
    gradient: 'linear-gradient(135deg, #3b82f6, #1e3a5f)',
  },
  {
    id: 'mp-6',
    name: 'Pixel Art Pack',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'RetroPixels',
    price: 30,
    metric: '1.1K clones',
    gradient: 'linear-gradient(135deg, #a855f7, #f472b6)',
  },
];

// ── Component ────────────────────────────────────────────────
export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Category>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = ITEMS.filter((item) => {
    const matchesTab = activeTab === 'all' || item.categorySlug === activeTab;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Marketplace
            </h1>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#8b5cf6',
                flexShrink: 0,
              }}
            />
          </div>

          <button
            type="button"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '0.5px solid var(--border)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-brand)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            }}
          >
            <Store size={13} />
            Publish
          </button>
        </div>

        {/* ── Search Bar ────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0 12px',
            height: 36,
            gap: 8,
            transition: 'border-color 150ms ease',
          }}
        >
          <Search
            size={14}
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search styles, templates, characters..."
            style={{
              flex: 1,
              fontSize: 12,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* ── Category Tabs ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORY_TABS.map((tab) => (
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
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Featured Banner ───────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f0a2e, #1a0a3e)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Star size={14} style={{ color: '#fbbf24' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Featured
              </span>
            </div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#ffffff',
                margin: '0 0 4px',
              }}
            >
              Cyberpunk Neon Pack
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
              }}
            >
              by Studio X
            </p>
          </div>
          <button
            type="button"
            style={{
              background: 'var(--brand)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Clone for free
          </button>
        </div>

        {/* ── Marketplace Grid ──────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: 'var(--bg-elevated)',
                border:
                  hoveredCard === item.id
                    ? '0.5px solid var(--border-brand)'
                    : '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
            >
              {/* Gradient preview */}
              <div
                style={{
                  height: 80,
                  background: item.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.categorySlug === 'audio' ? (
                  <Download size={24} style={{ color: 'rgba(255,255,255,0.5)' }} />
                ) : (
                  <Store size={24} style={{ color: 'rgba(255,255,255,0.5)' }} />
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: '10px 14px 14px' }}>
                {/* Title */}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {item.name}
                </span>

                {/* Category badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-hover)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-md)',
                    display: 'inline-block',
                    marginBottom: 8,
                  }}
                >
                  {item.category}
                </span>

                {/* Creator */}
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    margin: '0 0 8px',
                  }}
                >
                  by {item.creator}
                </p>

                {/* Price + metric row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: item.price === null ? '#22c55e' : 'var(--text-primary)',
                    }}
                  >
                    {item.price === null ? 'Free' : `${item.price} credits`}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Download size={10} />
                    {item.metric}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
