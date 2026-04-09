'use client';

import { useState } from 'react';
import { Heart, Sparkles, TrendingUp, Clock, ThumbsUp, Copy } from 'lucide-react';

const FILTERS = ['All', 'Cartoon', 'Cinematic', 'Anime', 'Sci-Fi', 'Fantasy'] as const;
const SORTS = ['Trending', 'New', 'Most liked'] as const;

const SORT_ICONS: Record<string, React.ReactNode> = {
  Trending: <TrendingUp size={14} />,
  New: <Clock size={14} />,
  'Most liked': <ThumbsUp size={14} />,
};

const MOCK_CARDS = [
  { creator: 'Luna Ray', style: 'Neon Dreamscape', likes: 2431, gradient: 'linear-gradient(135deg, #7c3aed, #06b6d4)' },
  { creator: 'Marco V.', style: 'Ghibli Soft', likes: 1897, gradient: 'linear-gradient(135deg, #34d399, #3b82f6)' },
  { creator: 'Aria Chen', style: 'Cyberpunk 90s', likes: 3205, gradient: 'linear-gradient(135deg, #f43f5e, #7c3aed)' },
  { creator: 'DevKnight', style: 'Pixel Noir', likes: 982, gradient: 'linear-gradient(135deg, #1e1e2e, #6366f1)' },
  { creator: 'Suki T.', style: 'Anime Pastel', likes: 4120, gradient: 'linear-gradient(135deg, #f9a8d4, #a78bfa)' },
  { creator: 'Omar J.', style: 'Desert Mirage', likes: 1543, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { creator: 'Zara Kim', style: 'Frozen Aether', likes: 2789, gradient: 'linear-gradient(135deg, #67e8f9, #818cf8)' },
  { creator: 'Ravi P.', style: 'Bollywood Glow', likes: 1102, gradient: 'linear-gradient(135deg, #fbbf24, #f43f5e)' },
  { creator: 'Ines M.', style: 'Watercolor Flow', likes: 876, gradient: 'linear-gradient(135deg, #a78bfa, #34d399)' },
  { creator: 'TJ Banks', style: 'Retro Sci-Fi', likes: 2150, gradient: 'linear-gradient(135deg, #0ea5e9, #22d3ee)' },
  { creator: 'Nadia L.', style: 'Dark Fantasy', likes: 3670, gradient: 'linear-gradient(135deg, #4c1d95, #991b1b)' },
  { creator: 'Kai O.', style: 'Toon Blast', likes: 1455, gradient: 'linear-gradient(135deg, #10b981, #fbbf24)' },
];

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeSort, setActiveSort] = useState<string>('Trending');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--brand-light)' }}>
          <Sparkles size={20} />
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Explore</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 12 }}>
          AnimaForge Explore
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 540, margin: '0 auto' }}>
          See what creators are making
        </p>
      </section>

      {/* Filters + Sort */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: activeFilter === f ? 'var(--border-brand)' : 'var(--border)',
                background: activeFilter === f ? 'var(--bg-active)' : 'transparent',
                color: activeFilter === f ? 'var(--text-brand)' : 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 6 }}>
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSort(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: activeSort === s ? 'var(--border-brand)' : 'var(--border)',
                background: activeSort === s ? 'var(--bg-active)' : 'transparent',
                color: activeSort === s ? 'var(--text-brand)' : 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {SORT_ICONS[s]}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 64px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {MOCK_CARDS.map((card, i) => (
          <div
            key={i}
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}
          >
            {/* Gradient placeholder */}
            <div style={{ height: 180, background: card.gradient }} />

            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{card.style}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>by {card.creator}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: 13 }}>
                  <Heart size={14} />
                  {card.likes.toLocaleString()}
                </span>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-brand)',
                    background: 'var(--brand-dim)',
                    color: 'var(--text-brand)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={13} />
                  Clone style
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '64px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Create your own</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 16 }}>
          Turn your ideas into stunning animations with AnimaForge
        </p>
        <a
          href="/onboarding"
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--brand)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          Start for free
        </a>
      </section>
    </div>
  );
}
