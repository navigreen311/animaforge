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

// ── Mock Data ──────────────────────────────────────────────────────
const CREATOR_GRADIENTS: Record<string, string> = {
  ArtBot: 'linear-gradient(135deg, #6366f1, #06b6d4)',
  StyleMaster: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  AnimaForge: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  CharacterLab: 'linear-gradient(135deg, #10b981, #065f46)',
  SoundForge: 'linear-gradient(135deg, #3b82f6, #1e3a5f)',
  RetroPixels: 'linear-gradient(135deg, #a855f7, #f472b6)',
};

const CREATOR_BIOS: Record<string, string> = {
  ArtBot:
    'Award-winning digital artist blending traditional painting with AI-assisted animation. Specializes in watercolor and impressionist styles.',
  StyleMaster:
    'Veteran anime-style artist with 10+ years in the industry. Creator of authentic cel-shaded aesthetics and classic Japanese looks.',
  AnimaForge:
    'Official AnimaForge creator account. Premium first-party packs crafted by the core studio team for maximum polish and compatibility.',
  CharacterLab:
    'Character design studio focused on rigged, production-ready models for animation, games, and interactive media.',
  SoundForge:
    'Independent music producer creating cinematic scores, foley, and sound design for animators and filmmakers worldwide.',
  RetroPixels:
    'Pixel art purist preserving the nostalgic beauty of 8-bit and 16-bit eras for modern creators.',
};

function getCreatorProfile(id: string): CreatorProfile {
  // id comes from the URL — decode it to use as display name
  const decoded = decodeURIComponent(id);
  const name = decoded;
  const initials = name
    .split(/[\s-_]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();

  const gradient =
    CREATOR_GRADIENTS[name] ?? 'linear-gradient(135deg, #6366f1, #8b5cf6)';

  const bio =
    CREATOR_BIOS[name] ??
    'Independent marketplace creator sharing original styles, templates, characters, and audio with the AnimaForge community.';

  // Mock 6 items for this creator
  const items: CreatorItem[] = [
    {
      id: `${id}-item-1`,
      name: 'Signature Style Pack',
      category: 'Style Pack',
      price: 45,
      rating: 4.6,
      ratingCount: 142,
      downloads: 980,
      gradient: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    },
    {
      id: `${id}-item-2`,
      name: 'Motion Template Kit',
      category: 'Template',
      price: null,
      rating: 4.8,
      ratingCount: 210,
      downloads: 2400,
      gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    },
    {
      id: `${id}-item-3`,
      name: 'Character Expressions',
      category: 'Characters',
      price: 80,
      rating: 4.4,
      ratingCount: 56,
      downloads: 340,
      gradient: 'linear-gradient(135deg, #10b981, #065f46)',
    },
    {
      id: `${id}-item-4`,
      name: 'Ambient Sound Library',
      category: 'Audio',
      price: 60,
      rating: 4.5,
      ratingCount: 89,
      downloads: 670,
      gradient: 'linear-gradient(135deg, #3b82f6, #1e3a5f)',
    },
    {
      id: `${id}-item-5`,
      name: 'Cinematic Overlay Pack',
      category: 'Style Pack',
      price: 35,
      rating: 4.3,
      ratingCount: 104,
      downloads: 820,
      gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    },
    {
      id: `${id}-item-6`,
      name: 'Hero Pose Collection',
      category: 'Characters',
      price: 95,
      rating: 4.7,
      ratingCount: 38,
      downloads: 210,
      gradient: 'linear-gradient(135deg, #a855f7, #f472b6)',
    },
  ];

  return {
    id,
    name,
    initials,
    bio,
    gradient,
    joinedDate: 'Joined March 2024',
    verified: ['ArtBot', 'StyleMaster', 'CharacterLab', 'SoundForge', 'AnimaForge'].includes(name),
    items,
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
      />
    );
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>{stars}</span>;
}

function formatDownloads(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Component ──────────────────────────────────────────────────────
export default function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const profile = useMemo(() => getCreatorProfile(id), [id]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Derived stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const itemCount = profile.items.length;
    const totalDownloads = profile.items.reduce((sum, i) => sum + i.downloads, 0);
    const avgRating =
      profile.items.reduce((sum, i) => sum + i.rating, 0) / profile.items.length;
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
