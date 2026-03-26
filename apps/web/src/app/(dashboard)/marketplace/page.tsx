'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Store,
  Search,
  Star,
  Heart,
  Download,
  ShoppingCart,
  Package,
  Eye,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  Gift,
  Edit,
  Trash2,
  Check,
  BarChart3,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ────────────────────────────────────────────────────────
type MainTab = 'shop' | 'library' | 'published' | 'wishlist';
type Category = 'all' | 'style-packs' | 'templates' | 'characters' | 'audio';
type SortOption = 'popular' | 'newest' | 'highest-rated' | 'price-low' | 'price-high';
type LicenseType = 'personal' | 'commercial';
type ItemStatus = 'live' | 'pending' | 'draft' | 'rejected';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  categorySlug: Category;
  creator: string;
  creatorAvatar: string;
  price: number | null;
  commercialPrice: number | null;
  rating: number;
  ratingCount: number;
  downloads: number;
  license: LicenseType;
  gradient: string;
  description: string;
  included: string[];
  tags: string[];
  reviews: Review[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewThisWeek?: boolean;
  isFreePick?: boolean;
}

interface OwnedItem extends MarketplaceItem {
  ownedDate: string;
}

interface PublishedItem extends MarketplaceItem {
  status: ItemStatus;
  revenue: number;
}

// ── Filter types ─────────────────────────────────────────────────
type PriceFilter = 'all' | 'free' | 'under-50' | '50-100' | 'over-100';
type RatingFilter = 'all' | '4plus' | '3plus' | '2plus';
type CreatorFilter = 'all' | 'official' | 'community' | 'verified';
type LicenseFilter = 'all' | 'personal' | 'commercial';

// ── Mock Reviews ─────────────────────────────────────────────────
const MOCK_REVIEWS: Review[] = [
  { id: 'r1', author: 'PixelPro', rating: 5, text: 'Absolutely stunning quality. The pack transformed my entire project in minutes.', date: '2026-03-18' },
  { id: 'r2', author: 'AnimeMaker42', rating: 4, text: 'Great variety and well-organized. Would love more color variations.', date: '2026-03-15' },
  { id: 'r3', author: 'StudioNova', rating: 4, text: 'Professional grade assets. The licensing terms are very fair too.', date: '2026-03-10' },
];

// ── Mock Data ────────────────────────────────────────────────────
const SHOP_ITEMS: MarketplaceItem[] = [
  {
    id: 'mp-1',
    name: 'Watercolor Dream',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'ArtBot',
    creatorAvatar: 'AB',
    price: null,
    commercialPrice: 80,
    rating: 4.5,
    ratingCount: 128,
    downloads: 1200,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    description: 'A beautiful hand-painted watercolor style pack that transforms your animations into dreamy, fluid watercolor art. Perfect for music videos, title sequences, and artistic short films.',
    included: ['12 watercolor brush presets', '6 color palettes', '4 texture overlays', 'Blending mode templates', 'Tutorial video'],
    tags: ['watercolor', 'artistic', 'dreamy', 'paint'],
    reviews: MOCK_REVIEWS,
    isFreePick: true,
    isTrending: true,
  },
  {
    id: 'mp-2',
    name: 'Anime Classic',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'StyleMaster',
    creatorAvatar: 'SM',
    price: 50,
    commercialPrice: 150,
    rating: 4.2,
    ratingCount: 89,
    downloads: 890,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    description: 'Classic anime aesthetic pack featuring cel-shading, dramatic lighting, and authentic Japanese animation styles from the golden era of anime.',
    included: ['8 cel-shade presets', '5 line-art styles', '3 dramatic lighting setups', 'Speed line templates', 'Expression sheet'],
    tags: ['anime', 'cel-shade', 'japanese', 'classic'],
    reviews: MOCK_REVIEWS,
    isTrending: true,
    isNewThisWeek: true,
  },
  {
    id: 'mp-3',
    name: 'Hero Template',
    category: 'Template',
    categorySlug: 'templates',
    creator: 'AnimaForge',
    creatorAvatar: 'AF',
    price: null,
    commercialPrice: null,
    rating: 4.8,
    ratingCount: 245,
    downloads: 3400,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    description: 'A complete hero animation template with pre-built sequences for intros, action shots, and dramatic reveals. Drop in your character and go.',
    included: ['5 intro sequences', '8 action poses', '3 reveal transitions', 'Camera presets', 'Sound effects pack'],
    tags: ['hero', 'action', 'template', 'intro'],
    reviews: MOCK_REVIEWS,
    isFreePick: true,
  },
  {
    id: 'mp-4',
    name: 'Villain Pack',
    category: 'Characters',
    categorySlug: 'characters',
    creator: 'CharacterLab',
    creatorAvatar: 'CL',
    price: 120,
    commercialPrice: 350,
    rating: 4.6,
    ratingCount: 67,
    downloads: 450,
    license: 'commercial',
    gradient: 'linear-gradient(135deg, #10b981, #065f46)',
    description: 'A sinister collection of villain archetypes ready for animation. Each character comes with full expression sheets, multiple outfits, and rigged models.',
    included: ['6 villain base models', '24 expressions per character', '3 outfits each', 'Rigged for animation', 'Backstory cards'],
    tags: ['villain', 'character', 'rigged', 'evil'],
    reviews: MOCK_REVIEWS,
    isNewThisWeek: true,
  },
  {
    id: 'mp-5',
    name: 'Cinematic Score',
    category: 'Audio',
    categorySlug: 'audio',
    creator: 'SoundForge',
    creatorAvatar: 'SF',
    price: 80,
    commercialPrice: 240,
    rating: 4.3,
    ratingCount: 103,
    downloads: 670,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #3b82f6, #1e3a5f)',
    description: 'Epic orchestral music loops and stems designed for animation. Includes tension builders, heroic themes, and emotional moments.',
    included: ['15 music loops', '8 stem packs', '20 sound effects', 'Tempo-synced markers', 'Mixing guide'],
    tags: ['audio', 'cinematic', 'orchestral', 'epic'],
    reviews: MOCK_REVIEWS,
    isTrending: true,
  },
  {
    id: 'mp-6',
    name: 'Pixel Art Pack',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'RetroPixels',
    creatorAvatar: 'RP',
    price: 30,
    commercialPrice: 90,
    rating: 4.1,
    ratingCount: 156,
    downloads: 1100,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #a855f7, #f472b6)',
    description: 'Transform any animation into retro pixel art. Multiple resolution presets from 8-bit to 32-bit styles with authentic dithering patterns.',
    included: ['4 resolution presets', '8 color palettes', '6 dithering patterns', 'Scanline overlay', 'CRT filter'],
    tags: ['pixel', 'retro', '8-bit', 'nostalgia'],
    reviews: MOCK_REVIEWS,
    isNewThisWeek: true,
    isFreePick: false,
  },
];

const LIBRARY_ITEMS: OwnedItem[] = [
  { ...SHOP_ITEMS[0], ownedDate: '2026-03-10' },
  { ...SHOP_ITEMS[2], ownedDate: '2026-03-05' },
];

const PUBLISHED_ITEMS: PublishedItem[] = [
  {
    id: 'pub-1',
    name: 'Neon Glow Effects',
    category: 'Style Pack',
    categorySlug: 'style-packs',
    creator: 'You',
    creatorAvatar: 'ME',
    price: 45,
    commercialPrice: 130,
    rating: 4.4,
    ratingCount: 32,
    downloads: 215,
    license: 'personal',
    gradient: 'linear-gradient(135deg, #f43f5e, #7c3aed)',
    description: 'Vibrant neon glow effects for cyberpunk and sci-fi animations.',
    included: ['10 glow presets', '5 neon palettes', '3 bloom filters'],
    tags: ['neon', 'glow', 'cyberpunk'],
    reviews: MOCK_REVIEWS,
    status: 'live',
    revenue: 1260,
  },
];

const WISHLIST_IDS_INIT = ['mp-2', 'mp-4'];

const CATEGORY_TABS: { label: string; value: Category }[] = [
  { label: 'All', value: 'all' },
  { label: 'Style Packs', value: 'style-packs' },
  { label: 'Templates', value: 'templates' },
  { label: 'Characters', value: 'characters' },
  { label: 'Audio', value: 'audio' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Newest', value: 'newest' },
  { label: 'Highest Rated', value: 'highest-rated' },
  { label: 'Price: Low → High', value: 'price-low' },
  { label: 'Price: High → Low', value: 'price-high' },
];

const MAIN_TABS: { label: string; value: MainTab; icon: typeof Store }[] = [
  { label: 'Shop', value: 'shop', icon: Store },
  { label: 'My Library', value: 'library', icon: Package },
  { label: 'My Published', value: 'published', icon: Sparkles },
  { label: 'Wishlist', value: 'wishlist', icon: Heart },
];

// ── Helpers ──────────────────────────────────────────────────────
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
          fill: filled ? '#fbbf24' : half ? 'url(#halfGrad)' : 'none',
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

function statusColor(status: ItemStatus): string {
  switch (status) {
    case 'live': return '#22c55e';
    case 'pending': return '#f59e0b';
    case 'draft': return 'var(--text-tertiary)';
    case 'rejected': return '#ef4444';
  }
}

// ── Component ────────────────────────────────────────────────────
export default function MarketplacePage() {
  // Main tab
  const [mainTab, setMainTab] = useState<MainTab>('shop');

  // Shop state
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filters
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>('all');
  const [licenseFilter, setLicenseFilter] = useState<LicenseFilter>('all');

  // Library filter
  const [libraryFilter, setLibraryFilter] = useState<Category>('all');

  // Detail panel
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Purchase modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseLicense, setPurchaseLicense] = useState<LicenseType>('personal');

  // User state
  const [userBalance, setUserBalance] = useState(500);
  const [ownedIds, setOwnedIds] = useState<string[]>(LIBRARY_ITEMS.map((i) => i.id));
  const [wishlistIds, setWishlistIds] = useState<string[]>(WISHLIST_IDS_INIT);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Card hover
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Derived data ───────────────────────────────────────────────
  const filteredShopItems = useMemo(() => {
    let items = [...SHOP_ITEMS];

    // Category
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.categorySlug === activeCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.creator.toLowerCase().includes(q) ||
          i.tags.some((t) => t.includes(q))
      );
    }

    // Price filter
    if (priceFilter === 'free') items = items.filter((i) => i.price === null);
    else if (priceFilter === 'under-50') items = items.filter((i) => i.price !== null && i.price < 50);
    else if (priceFilter === '50-100') items = items.filter((i) => i.price !== null && i.price >= 50 && i.price <= 100);
    else if (priceFilter === 'over-100') items = items.filter((i) => i.price !== null && i.price > 100);

    // Rating filter
    if (ratingFilter === '4plus') items = items.filter((i) => i.rating >= 4);
    else if (ratingFilter === '3plus') items = items.filter((i) => i.rating >= 3);
    else if (ratingFilter === '2plus') items = items.filter((i) => i.rating >= 2);

    // Creator filter
    if (creatorFilter === 'official') items = items.filter((i) => i.creator === 'AnimaForge');
    else if (creatorFilter === 'verified') items = items.filter((i) => ['ArtBot', 'StyleMaster', 'CharacterLab', 'SoundForge'].includes(i.creator));
    else if (creatorFilter === 'community') items = items.filter((i) => !['AnimaForge'].includes(i.creator));

    // License filter
    if (licenseFilter === 'personal') items = items.filter((i) => i.license === 'personal');
    else if (licenseFilter === 'commercial') items = items.filter((i) => i.license === 'commercial');

    // Sort
    switch (sortBy) {
      case 'popular': items.sort((a, b) => b.downloads - a.downloads); break;
      case 'newest': items.sort((a, b) => (b.isNewThisWeek ? 1 : 0) - (a.isNewThisWeek ? 1 : 0)); break;
      case 'highest-rated': items.sort((a, b) => b.rating - a.rating); break;
      case 'price-low': items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case 'price-high': items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
    }

    return items;
  }, [activeCategory, searchQuery, sortBy, priceFilter, ratingFilter, creatorFilter, licenseFilter]);

  const trendingItems = SHOP_ITEMS.filter((i) => i.isTrending);
  const newItems = SHOP_ITEMS.filter((i) => i.isNewThisWeek);
  const freeItems = SHOP_ITEMS.filter((i) => i.isFreePick);
  const wishlistItems = SHOP_ITEMS.filter((i) => wishlistIds.includes(i.id));

  // ── Handlers ───────────────────────────────────────────────────
  const openDetail = useCallback((item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowDetailPanel(true);
    setReviewRating(0);
    setReviewText('');
  }, []);

  const closeDetail = useCallback(() => {
    setShowDetailPanel(false);
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  const toggleWishlist = useCallback((itemId: string) => {
    setWishlistIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
    toast.success(wishlistIds.includes(itemId) ? 'Removed from wishlist' : 'Added to wishlist');
  }, [wishlistIds]);

  const openPurchaseModal = useCallback(() => {
    if (!selectedItem) return;
    setPurchaseLicense(selectedItem.license === 'commercial' ? 'commercial' : 'personal');
    setShowPurchaseModal(true);
  }, [selectedItem]);

  const confirmPurchase = useCallback(() => {
    if (!selectedItem) return;
    const cost = purchaseLicense === 'commercial'
      ? (selectedItem.commercialPrice ?? selectedItem.price ?? 0)
      : (selectedItem.price ?? 0);
    if (cost > userBalance) {
      toast.error('Insufficient balance');
      return;
    }
    setUserBalance((b) => b - cost);
    setOwnedIds((prev) => [...prev, selectedItem.id]);
    setShowPurchaseModal(false);
    toast.success(`Purchased "${selectedItem.name}" for ${cost} credits`);
  }, [selectedItem, purchaseLicense, userBalance]);

  const addFreeToLibrary = useCallback(() => {
    if (!selectedItem) return;
    setOwnedIds((prev) => [...prev, selectedItem.id]);
    toast.success(`Added "${selectedItem.name}" to your library`);
  }, [selectedItem]);

  const submitReview = useCallback(() => {
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    if (!reviewText.trim()) { toast.error('Please write a review'); return; }
    toast.success('Review submitted successfully!');
    setReviewRating(0);
    setReviewText('');
  }, [reviewRating, reviewText]);

  const purchaseAllWishlist = useCallback(() => {
    const unpurchased = wishlistItems.filter((i) => !ownedIds.includes(i.id));
    const totalCost = unpurchased.reduce((sum, i) => sum + (i.price ?? 0), 0);
    if (totalCost > userBalance) {
      toast.error('Insufficient balance for all items');
      return;
    }
    setUserBalance((b) => b - totalCost);
    setOwnedIds((prev) => [...prev, ...unpurchased.map((i) => i.id)]);
    toast.success(`Purchased ${unpurchased.length} items for ${totalCost} credits`);
  }, [wishlistItems, ownedIds, userBalance]);

  // ── Shared card styles ─────────────────────────────────────────
  const cardStyle = (itemId: string): React.CSSProperties => ({
    background: 'var(--bg-elevated)',
    border: hoveredCard === itemId ? '0.5px solid var(--border-brand)' : '0.5px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, transform 150ms ease',
    transform: hoveredCard === itemId ? 'translateY(-2px)' : 'translateY(0)',
  });

  // ── Render: Item Card ──────────────────────────────────────────
  const renderItemCard = (item: MarketplaceItem, options?: { showOwned?: boolean; showWishlistRemove?: boolean; showUseInStudio?: boolean }) => (
    <div
      key={item.id}
      onMouseEnter={() => setHoveredCard(item.id)}
      onMouseLeave={() => setHoveredCard(null)}
      style={cardStyle(item.id)}
    >
      {/* Gradient preview */}
      <div
        onClick={() => openDetail(item)}
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

        {/* Wishlist button overlay */}
        {!options?.showWishlistRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
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
              transition: 'background 150ms ease',
            }}
          >
            <Heart
              size={14}
              style={{
                color: wishlistIds.includes(item.id) ? '#f43f5e' : 'rgba(255,255,255,0.8)',
                fill: wishlistIds.includes(item.id) ? '#f43f5e' : 'none',
              }}
            />
          </button>
        )}

        {/* Owned badge */}
        {options?.showOwned && (
          <span style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#22c55e',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <Check size={10} /> Owned
          </span>
        )}

        {/* Wishlist remove */}
        {options?.showWishlistRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(239,68,68,0.8)',
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
            <Trash2 size={12} style={{ color: '#fff' }} />
          </button>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 14px 14px' }} onClick={() => openDetail(item)}>
        {/* Title */}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
          {item.name}
        </span>

        {/* Creator */}
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          by {item.creator}
        </p>

        {/* Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          {renderStars(item.rating, 11)}
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.rating.toFixed(1)}</span>
        </div>

        {/* Price + license + downloads */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Price badge */}
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: item.price === null ? '#22c55e' : 'var(--text-primary)',
              background: item.price === null ? 'rgba(34,197,94,0.1)' : 'transparent',
              padding: item.price === null ? '1px 8px' : 0,
              borderRadius: 'var(--radius-md)',
            }}>
              {item.price === null ? 'Free' : `${item.price} cr`}
            </span>

            {/* License pill */}
            <span style={{
              fontSize: 9,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-md)',
              background: item.license === 'commercial' ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
              color: item.license === 'commercial' ? '#22c55e' : 'var(--text-tertiary)',
              textTransform: 'capitalize',
            }}>
              {item.license}
            </span>
          </div>

          {/* Downloads */}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Download size={10} />
            {formatDownloads(item.downloads)}
          </span>
        </div>

        {/* Use in Studio button for library */}
        {options?.showUseInStudio && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toast.success('Opening in Studio...'); }}
            style={{
              marginTop: 10,
              width: '100%',
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              padding: '7px 0',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <ExternalLink size={12} /> Use in Studio
          </button>
        )}
      </div>
    </div>
  );

  // ── Render: Horizontal Scroll Section ──────────────────────────
  const renderScrollSection = (title: string, icon: React.ReactNode, items: MarketplaceItem[]) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <div style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
          scrollbarWidth: 'thin',
        }}>
          {items.map((item) => (
            <div key={item.id} style={{ minWidth: 200, maxWidth: 200, flexShrink: 0 }}>
              {renderItemCard(item)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render: Filter Sidebar ─────────────────────────────────────
  const renderFilterSidebar = () => (
    <div style={{
      width: 200,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      paddingRight: 16,
      borderRight: '0.5px solid var(--border)',
    }}>
      {/* Price */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>Price</span>
        {([['all', 'Any price'], ['free', 'Free'], ['under-50', 'Under 50 cr'], ['50-100', '50–100 cr'], ['over-100', 'Over 100 cr']] as [PriceFilter, string][]).map(([val, label]) => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
            <input type="radio" name="price" checked={priceFilter === val} onChange={() => setPriceFilter(val)} style={{ accentColor: 'var(--brand)' }} />
            {label}
          </label>
        ))}
      </div>

      {/* Rating */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>Rating</span>
        {([['all', 'All ratings'], ['4plus', '4+ stars'], ['3plus', '3+ stars'], ['2plus', '2+ stars']] as [RatingFilter, string][]).map(([val, label]) => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
            <input type="radio" name="rating" checked={ratingFilter === val} onChange={() => setRatingFilter(val)} style={{ accentColor: 'var(--brand)' }} />
            {label}
          </label>
        ))}
      </div>

      {/* Creator type */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>Creator</span>
        {([['all', 'All creators'], ['official', 'Official'], ['verified', 'Verified'], ['community', 'Community']] as [CreatorFilter, string][]).map(([val, label]) => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
            <input type="radio" name="creator" checked={creatorFilter === val} onChange={() => setCreatorFilter(val)} style={{ accentColor: 'var(--brand)' }} />
            {label}
          </label>
        ))}
      </div>

      {/* License type */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>License</span>
        {([['all', 'All licenses'], ['personal', 'Personal'], ['commercial', 'Commercial']] as [LicenseFilter, string][]).map(([val, label]) => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
            <input type="radio" name="license" checked={licenseFilter === val} onChange={() => setLicenseFilter(val)} style={{ accentColor: 'var(--brand)' }} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );

  // ── Render: Item Detail Panel ──────────────────────────────────
  const renderDetailPanel = () => {
    if (!selectedItem) return null;
    const isOwned = ownedIds.includes(selectedItem.id);
    const isFree = selectedItem.price === null;
    const currentPrice = purchaseLicense === 'commercial'
      ? (selectedItem.commercialPrice ?? selectedItem.price ?? 0)
      : (selectedItem.price ?? 0);

    return (
      <AnimatePresence>
        {showDetailPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 999,
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 480,
                height: '100vh',
                background: 'var(--bg-surface)',
                borderLeft: '0.5px solid var(--border)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                {/* Close button */}
                <button
                  type="button"
                  onClick={closeDetail}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  <X size={16} style={{ color: '#fff' }} />
                </button>

                {/* Large preview */}
                <div style={{
                  height: 300,
                  background: selectedItem.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Store size={56} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px' }}>
                  {/* Name + type */}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    {selectedItem.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      background: 'var(--bg-hover)',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      {selectedItem.category}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      by {selectedItem.creator}
                    </span>
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    {renderStars(selectedItem.rating)}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedItem.rating.toFixed(1)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>({selectedItem.ratingCount} ratings)</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Download size={11} /> {formatDownloads(selectedItem.downloads)} downloads
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Description</span>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                      {selectedItem.description}
                    </p>
                  </div>

                  {/* What's included */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>What&apos;s included</span>
                    <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc' }}>
                      {selectedItem.included.map((inc, idx) => (
                        <li key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, lineHeight: 1.5 }}>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedItem.tags.map((tag) => (
                        <span key={tag} style={{
                          fontSize: 10,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-hover)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-md)',
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Creator info card */}
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 14,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: selectedItem.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {selectedItem.creatorAvatar}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        {selectedItem.creator}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Marketplace Creator
                      </span>
                    </div>
                  </div>

                  {/* License terms */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>License terms</span>
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 12,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-hover)',
                          color: 'var(--text-tertiary)',
                        }}>
                          Personal: {selectedItem.price === null && selectedItem.commercialPrice === null ? 'Free' : selectedItem.price === null ? 'Free' : `${selectedItem.price} cr`}
                        </span>
                        {selectedItem.commercialPrice !== null && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(34,197,94,0.15)',
                            color: '#22c55e',
                          }}>
                            Commercial: {selectedItem.commercialPrice} cr
                          </span>
                        )}
                      </div>
                      Personal license allows use in non-commercial projects. Commercial license grants full redistribution and monetization rights.
                    </div>
                  </div>

                  {/* Reviews section */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
                      Reviews ({selectedItem.reviews.length})
                    </span>
                    {selectedItem.reviews.map((review) => (
                      <div key={review.id} style={{
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 12,
                        marginBottom: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{review.author}</span>
                            {renderStars(review.rating, 10)}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{review.date}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{review.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Write review (if owned) */}
                  {isOwned && (
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 14,
                      marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                        Write a review
                      </span>
                      {/* Star picker */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star
                              size={18}
                              style={{
                                color: s <= reviewRating ? '#fbbf24' : 'var(--text-tertiary)',
                                fill: s <= reviewRating ? '#fbbf24' : 'none',
                                transition: 'color 100ms ease',
                              }}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this item..."
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'var(--bg-surface)',
                          border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 10,
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={submitReview}
                        style={{
                          marginTop: 8,
                          background: 'var(--brand)',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Submit review
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed footer */}
              <div style={{
                borderTop: '0.5px solid var(--border)',
                padding: '14px 24px',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isFree ? '#22c55e' : 'var(--text-primary)' }}>
                    {isFree ? 'Free' : `${selectedItem.price} credits`}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Balance: {userBalance} credits
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!isOwned && (
                    <button
                      type="button"
                      onClick={() => toggleWishlist(selectedItem.id)}
                      style={{
                        background: 'transparent',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Heart
                        size={16}
                        style={{
                          color: wishlistIds.includes(selectedItem.id) ? '#f43f5e' : 'var(--text-secondary)',
                          fill: wishlistIds.includes(selectedItem.id) ? '#f43f5e' : 'none',
                        }}
                      />
                    </button>
                  )}
                  {isOwned ? (
                    <button
                      type="button"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#22c55e',
                        border: '0.5px solid rgba(34,197,94,0.3)',
                        padding: '8px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Check size={14} /> In your library
                    </button>
                  ) : isFree ? (
                    <button
                      type="button"
                      onClick={addFreeToLibrary}
                      style={{
                        background: 'var(--brand)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Package size={14} /> Free: Add to Library
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openPurchaseModal}
                      style={{
                        background: 'var(--brand)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ShoppingCart size={14} /> Purchase for {selectedItem.price} credits
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  // ── Render: Purchase Confirmation Modal ────────────────────────
  const renderPurchaseModal = () => {
    if (!selectedItem || !showPurchaseModal) return null;
    const personalPrice = selectedItem.price ?? 0;
    const commercialPrice = selectedItem.commercialPrice ?? personalPrice;
    const finalPrice = purchaseLicense === 'commercial' ? commercialPrice : personalPrice;
    const balanceAfter = userBalance - finalPrice;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowPurchaseModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              width: 400,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Confirm Purchase
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              {selectedItem.name}
            </p>

            {/* License selector */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                License type
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPurchaseLicense('personal')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: purchaseLicense === 'personal' ? 'var(--bg-elevated)' : 'transparent',
                    border: purchaseLicense === 'personal' ? '1px solid var(--border-brand)' : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Personal</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{personalPrice} credits</span>
                </button>
                {selectedItem.commercialPrice !== null && (
                  <button
                    type="button"
                    onClick={() => setPurchaseLicense('commercial')}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: purchaseLicense === 'commercial' ? 'var(--bg-elevated)' : 'transparent',
                      border: purchaseLicense === 'commercial' ? '1px solid var(--border-brand)' : '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Commercial</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{commercialPrice} credits</span>
                  </button>
                )}
              </div>
            </div>

            {/* Balance info */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 12,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current balance</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{userBalance} credits</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Item cost</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>-{finalPrice} credits</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Balance after</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: balanceAfter >= 0 ? '#22c55e' : '#ef4444' }}>
                  {balanceAfter} credits
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border)',
                  padding: '8px 18px',
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
                onClick={confirmPurchase}
                disabled={balanceAfter < 0}
                style={{
                  background: balanceAfter >= 0 ? 'var(--brand)' : 'var(--bg-hover)',
                  color: balanceAfter >= 0 ? '#fff' : 'var(--text-tertiary)',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: balanceAfter >= 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ── Render: Shop Tab ───────────────────────────────────────────
  const renderShopTab = () => (
    <>
      {/* Featured hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0a2e, #1a0a3e)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Featured
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>
            Cyberpunk Neon Pack
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>
            by Studio X &middot; 2.4K downloads
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {renderStars(4.7, 12)}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>4.7</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.success('Featured item cloned!')}
          style={{
            background: 'var(--brand)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 22px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Clone for free
        </button>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0 12px',
        height: 36,
        gap: 8,
        marginBottom: 12,
      }}>
        <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search styles, templates, characters, audio..."
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

      {/* Category tabs + sort dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveCategory(tab.value)}
              style={{
                background: activeCategory === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color: activeCategory === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeCategory === tab.value ? '0.5px solid var(--border)' : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeCategory === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            <ChevronDown size={12} />
          </button>
          {showSortDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 4,
              zIndex: 100,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: sortBy === opt.value ? 'var(--bg-hover)' : 'transparent',
                    color: sortBy === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content: sidebar + grid */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Filter sidebar */}
        {renderFilterSidebar()}

        {/* Right content area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Discovery sections (only when not searching) */}
          {!searchQuery.trim() && activeCategory === 'all' && (
            <>
              {renderScrollSection('Trending this week', <TrendingUp size={14} style={{ color: '#f43f5e' }} />, trendingItems)}
              {renderScrollSection('New this week', <Clock size={14} style={{ color: '#3b82f6' }} />, newItems)}
              {renderScrollSection('Free picks', <Gift size={14} style={{ color: '#22c55e' }} />, freeItems)}
            </>
          )}

          {/* All items grid */}
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
              {searchQuery.trim() ? `Search results (${filteredShopItems.length})` : `All items (${filteredShopItems.length})`}
            </span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {filteredShopItems.map((item) => renderItemCard(item))}
            </div>
            {filteredShopItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                No items found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // ── Render: My Library Tab ─────────────────────────────────────
  const renderLibraryTab = () => {
    const libraryItems = LIBRARY_ITEMS.filter((i) => libraryFilter === 'all' || i.categorySlug === libraryFilter);
    // Also include dynamically purchased items
    const dynamicOwned = SHOP_ITEMS.filter((i) => ownedIds.includes(i.id) && !LIBRARY_ITEMS.some((li) => li.id === i.id));
    const allLibrary = [...libraryItems, ...dynamicOwned].filter((i) => libraryFilter === 'all' || i.categorySlug === libraryFilter);

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Your Library ({allLibrary.length} items)
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setLibraryFilter(tab.value)}
                style={{
                  background: libraryFilter === tab.value ? 'var(--bg-elevated)' : 'transparent',
                  color: libraryFilter === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: libraryFilter === tab.value ? '0.5px solid var(--border)' : '0.5px solid transparent',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11,
                  fontWeight: libraryFilter === tab.value ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {allLibrary.map((item) => renderItemCard(item, { showOwned: true, showUseInStudio: true }))}
        </div>
        {allLibrary.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            <Package size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <div>Your library is empty. Browse the shop to find items.</div>
          </div>
        )}
      </>
    );
  };

  // ── Render: My Published Tab ───────────────────────────────────
  const renderPublishedTab = () => {
    const totalEarnings = PUBLISHED_ITEMS.reduce((sum, i) => sum + i.revenue, 0);
    const totalDownloads = PUBLISHED_ITEMS.reduce((sum, i) => sum + i.downloads, 0);

    return (
      <>
        {/* Earnings summary */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
        }}>
          {[
            { label: 'Total Earnings', value: `${totalEarnings} cr`, icon: <DollarSign size={14} style={{ color: '#22c55e' }} />, bg: 'rgba(34,197,94,0.1)' },
            { label: 'Total Downloads', value: formatDownloads(totalDownloads), icon: <Download size={14} style={{ color: '#3b82f6' }} />, bg: 'rgba(59,130,246,0.1)' },
            { label: 'Published Items', value: String(PUBLISHED_ITEMS.length), icon: <Package size={14} style={{ color: '#a855f7' }} />, bg: 'rgba(168,85,247,0.1)' },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {stat.icon}
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block' }}>{stat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Published items list */}
        {PUBLISHED_ITEMS.map((item) => (
          <div key={item.id} style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Preview */}
            <div style={{
              width: 80,
              height: 60,
              borderRadius: 'var(--radius-lg)',
              background: item.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Store size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-md)',
                  background: `${statusColor(item.status)}20`,
                  color: statusColor(item.status),
                  textTransform: 'uppercase',
                }}>
                  {item.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Download size={10} /> {formatDownloads(item.downloads)} downloads
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <DollarSign size={10} /> {item.revenue} cr earned
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {renderStars(item.rating, 10)}
                  <span style={{ marginLeft: 2 }}>{item.rating.toFixed(1)}</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => toast.success('Opening editor...')}
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Edit size={11} /> Edit
              </button>
              <button
                type="button"
                onClick={() => toast.success('Item unpublished')}
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Eye size={11} /> Unpublish
              </button>
            </div>
          </div>
        ))}

        {PUBLISHED_ITEMS.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            <Store size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <div>You haven&apos;t published any items yet.</div>
          </div>
        )}
      </>
    );
  };

  // ── Render: Wishlist Tab ───────────────────────────────────────
  const renderWishlistTab = () => {
    const unpurchasedCount = wishlistItems.filter((i) => !ownedIds.includes(i.id)).length;
    const totalCost = wishlistItems.filter((i) => !ownedIds.includes(i.id)).reduce((sum, i) => sum + (i.price ?? 0), 0);

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Wishlist ({wishlistItems.length} items)
          </span>
          {unpurchasedCount > 0 && (
            <button
              type="button"
              onClick={purchaseAllWishlist}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                padding: '7px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ShoppingCart size={13} /> Purchase all ({totalCost} credits)
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {wishlistItems.map((item) => renderItemCard(item, { showWishlistRemove: true }))}
        </div>
        {wishlistItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            <Heart size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <div>Your wishlist is empty. Heart items to save them here.</div>
          </div>
        )}
      </>
    );
  };

  // ── Main Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflowY: 'auto',
        flex: 1,
      }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Marketplace
            </h1>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#8b5cf6',
              flexShrink: 0,
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShoppingCart size={12} /> {userBalance} credits
            </span>
            <button
              type="button"
              onClick={() => { setMainTab('published'); toast.success('Create a new listing from My Published tab'); }}
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
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-brand)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            >
              <Store size={13} /> Publish
            </button>
          </div>
        </div>

        {/* Main Tab Bar */}
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: 20,
          borderBottom: '0.5px solid var(--border)',
        }}>
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMainTab(tab.value)}
                style={{
                  background: 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                  padding: '8px 18px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                <Icon size={14} />
                {tab.label}
                {tab.value === 'wishlist' && wishlistIds.length > 0 && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    background: '#f43f5e',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {wishlistIds.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {mainTab === 'shop' && renderShopTab()}
        {mainTab === 'library' && renderLibraryTab()}
        {mainTab === 'published' && renderPublishedTab()}
        {mainTab === 'wishlist' && renderWishlistTab()}
      </main>

      {/* Detail Panel (overlay) */}
      {renderDetailPanel()}

      {/* Purchase Modal (overlay) */}
      {renderPurchaseModal()}
    </div>
  );
}
