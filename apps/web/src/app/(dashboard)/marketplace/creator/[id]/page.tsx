'use client';

import { useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Download,
  Package,
  UserPlus,
  UserCheck,
  Store,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { useResource } from '@/lib/api/useResource';

// ── Types ──────────────────────────────────────────────────────────
interface CreatorItem {
  id: string;
  name: string;
  category: string;
  price: number | null;
  rating: number;
  ratingCount: number;
  downloads: number;
  gradient: string;
}

interface CreatorProfile {
  id: string;
  name: string;
  initials: string;
  bio: string;
  gradient: string;
  joinedDate: string;
  verified: boolean;
  items: CreatorItem[];
}

// ── Data ────────────────────────────────────────────────

/** One row of GET /api/marketplace/items. */
interface MarketItemRow {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  creatorId: string;
  category: string;
  purchaseCount: number;
  createdAt: string;
}

const ITEM_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #06b6d4)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #065f46)',
];

function initialsFor(name: string): string {
  return (
    name
      .split(/[\s-_]+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || name.slice(0, 2).toUpperCase()
  );
}

/**
 * Build a creator profile from that creator's listings.
 *
 * `getCreatorProfile` used to invent one: a hand-written bio per known creator
 * name, a "Joined March 2024" date for everyone, a verified badge for five
 * hardcoded names and six fabricated listings with ratings and download counts.
 *
 * There is no creator table -- marketplace_items carries a creator_id and
 * nothing else about the person -- so the profile is what the listings say.
 * The bio, join date and verified badge are gone because nothing records them,
 * ratings come from the reviews the item actually has (not shown here, so
 * zero), and `downloads` is the item's real purchase count.
 */
function toProfile(id: string, rows: MarketItemRow[]): CreatorProfile {
  const name = decodeURIComponent(id);
  return {
    id,
    name,
    initials: initialsFor(name),
    bio: '',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    joinedDate: '',
    verified: false,
    items: rows.map((row, i) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price,
      rating: 0,
      ratingCount: 0,
      downloads: row.purchaseCount,
      gradient: ITEM_GRADIENTS[i % ITEM_GRADIENTS.length],
    })),
  };
}

// ── Helpers ────────────────────────────────────────────────────────
function renderStars(rating: number, size = 12) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.floor(rating);
    const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.3;
    stars.push(
      <Star
        key={i}
        size={size}
        style={{
          color: filled || half ? '#fbbf24' : 'var(--text-tertiary)',
          fill: filled ? '#fbbf24' : 'none',
          flexShrink: 0,
        }}
      />,
    );
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>{stars}</span>;
}

function formatDownloads(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Component ──────────────────────────────────────────────────────
export default function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const state = useResource<{ items: MarketItemRow[] }>('/api/marketplace/items?limit=100');
  const profile = useMemo(
    () =>
      toProfile(
        id,
        (state.data?.items ?? []).filter((row) => row.creatorId === id),
      ),
    [id, state.data],
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Derived stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const itemCount = profile.items.length;
    const totalDownloads = profile.items.reduce((sum, i) => sum + i.downloads, 0);
    const avgRating = itemCount
      ? profile.items.reduce((sum, i) => sum + i.rating, 0) / itemCount
      : 0;
    return { itemCount, totalDownloads, avgRating };
  }, [profile]);

  const handleFollow = () => {
    setIsFollowing((prev) => !prev);
    toast.success(isFollowing ? `Unfollowed ${profile.name}` : `Now following ${profile.name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Back button ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => router.push('/marketplace')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            padding: 0,
            marginBottom: 16,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
          }}
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </button>

        {/* ── Profile header ──────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: profile.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {profile.initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {profile.name}
              </h1>
              {profile.verified && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(34,197,94,0.15)',
                    color: '#22c55e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Verified
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                margin: '0 0 10px',
              }}
            >
              {profile.joinedDate}
            </p>

            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 16px',
                maxWidth: 620,
              }}
            >
              {profile.bio}
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stats.itemCount}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>items</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDownloads(stats.totalDownloads)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>downloads</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stats.avgRating.toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>avg rating</span>
              </div>
            </div>
          </div>

          {/* Follow button */}
          <button
            type="button"
            onClick={handleFollow}
            style={{
              background: isFollowing ? 'transparent' : 'var(--brand)',
              color: isFollowing ? 'var(--text-primary)' : '#fff',
              border: isFollowing ? '0.5px solid var(--border)' : 'none',
              padding: '9px 20px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            {isFollowing ? (
              <>
                <UserCheck size={13} /> Following
              </>
            ) : (
              <>
                <UserPlus size={13} /> Follow
              </>
            )}
          </button>
        </div>

        {/* ── Items grid ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Items by {profile.name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            ({profile.items.length})
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {profile.items.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                router.push('/marketplace');
                toast.success(`Opening "${item.name}"`);
              }}
              style={{
                background: 'var(--bg-elevated)',
                border:
                  hoveredCard === item.id
                    ? '0.5px solid var(--border-brand)'
                    : '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 150ms ease, transform 150ms ease',
                transform: hoveredCard === item.id ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              {/* Preview */}
              <div
                style={{
                  height: 90,
                  background: item.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Store size={28} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success('Added to wishlist');
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={14} style={{ color: 'rgba(255,255,255,0.8)' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '10px 14px 14px' }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: 2,
                  }}
                >
                  {item.name}
                </span>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    margin: '0 0 6px',
                  }}
                >
                  {item.category}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  {renderStars(item.rating, 11)}
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {item.rating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    ({item.ratingCount})
                  </span>
                </div>
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
                      background: item.price === null ? 'rgba(34,197,94,0.1)' : 'transparent',
                      padding: item.price === null ? '1px 8px' : 0,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {item.price === null ? 'Free' : `${item.price} cr`}
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
                    {formatDownloads(item.downloads)}
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
