'use client';

import { useState } from 'react';
import { useResource } from '@/lib/api/useResource';
import { ResourceView } from '@/components/api/ResourceStates';
import { Heart, Sparkles, TrendingUp, Clock, ThumbsUp, Copy } from 'lucide-react';

const FILTERS = ['All', 'Cartoon', 'Cinematic', 'Anime', 'Sci-Fi', 'Fantasy'] as const;
const SORTS = ['Trending', 'New', 'Most liked'] as const;

const SORT_ICONS: Record<string, React.ReactNode> = {
  Trending: <TrendingUp size={14} />,
  New: <Clock size={14} />,
  'Most liked': <ThumbsUp size={14} />,
};

/** One post from GET /api/explore. */
interface ExplorePost {
  id: string;
  outputUrl: string | null;
  publicCaption: string | null;
  publicLikes: number;
  modelId: string;
  createdAt: string;
  user: { id: string; displayName: string | null; avatarUrl: string | null } | null;
}

interface ExploreFeed {
  items: ExplorePost[];
  total: number;
}

/**
 * A deterministic gradient per post.
 *
 * The mock rows each carried a hand-picked gradient. Real posts have an output
 * URL instead, and until a thumbnail pipeline exists the tile needs *some*
 * fill — derived from the id so a post looks the same on every load, rather
 * than random per render.
 */
const GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #06b6d4)',
  'linear-gradient(135deg, #34d399, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #22c55e)',
  'linear-gradient(135deg, #f97316, #eab308)',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

const SORT_PARAM: Record<string, string> = {
  Trending: 'trending',
  New: 'new',
  'Most liked': 'liked',
};

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeSort, setActiveSort] = useState<string>('Trending');
  const state = useResource<ExploreFeed>(
    `/api/explore?sort=${SORT_PARAM[activeSort] ?? 'trending'}`,
    [activeSort],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            color: 'var(--brand-light)',
          }}
        >
          <Sparkles size={20} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Explore
          </span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 600, marginBottom: 12 }}>AnimaForge Explore</h1>
        <p
          style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 540, margin: '0 auto' }}
        >
          See what creators are making
        </p>
      </section>

      {/* Filters + Sort */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
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
        <ResourceView
          state={state}
          isEmpty={(d) => d.items.length === 0}
          emptyTitle="Nothing shared yet"
          emptyHint="Public generations appear here once creators publish them."
          loadingLabel="Loading the gallery…"
        >
          {(list) =>
            list.items.map((card) => (
              <div
                key={card.id}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Gradient placeholder */}
                <div style={{ height: 180, background: gradientFor(card.id) }} />

                <div style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                    {card.publicCaption ?? card.modelId}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    by {card.user?.displayName ?? 'Unknown creator'}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                      }}
                    >
                      <Heart size={14} />
                      {card.publicLikes.toLocaleString()}
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
            ))
          }
        </ResourceView>
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
