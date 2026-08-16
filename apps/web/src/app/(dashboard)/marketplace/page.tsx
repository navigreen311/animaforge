'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useResource, mutate } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import {
  Store,
  Search,
  Star,
  Heart,
  Download,
  ShoppingCart,
  ShoppingBag,
  Wallet,
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
  Shield,
  Loader,
  AlertCircle,
  Trophy,
  Upload,
  ArrowLeft,
  ArrowRight,
  Users,
  FileText,
  Music,
  Layers,
  Workflow,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '@/components/ui/EmptyState';

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

// ── Mock Data ────────────────────────────────────────────────────

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
      />,
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
    case 'live':
      return '#22c55e';
    case 'pending':
      return '#f59e0b';
    case 'draft':
      return 'var(--text-tertiary)';
    case 'rejected':
      return '#ef4444';
  }
}

// ── Component ────────────────────────────────────────────────────
/* ------------------------------------------------------------------ */
/*  Live data                                                          */
/* ------------------------------------------------------------------ */

/** One row of GET /api/marketplace/items. */
interface ItemRow {
  id: string;
  name: string;
  type: string;
  price: string | number;
  description: string;
  previewUrl: string;
  creatorId: string;
  status: string;
  featured: boolean;
  category: string;
  purchaseCount: number;
  createdAt: string;
  averageRating?: number | null;
  reviewCount?: number;
}

interface ItemList {
  items: ItemRow[];
  total: number;
}

interface PublishedList {
  items: Array<ItemRow & { revenueCents: number; salesCount: number }>;
  total: number;
}

interface LibraryList {
  items: Array<ItemRow & { purchasedAt: string }>;
  total: number;
}

const ITEM_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #ec4899)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #8b5cf6, #f472b6)',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ITEM_GRADIENTS[hash % ITEM_GRADIENTS.length];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Map a listing row to the card this screen renders.
 *
 * Several card fields have no column and are derived or left empty rather than
 * invented: the preview is a deterministic gradient (there is no thumbnail
 * pipeline), `included` and `tags` are not modelled, and the reviews array is
 * empty because reviews are fetched per item on the detail panel rather than
 * embedded in the list. `isTrending` is purchase volume and `isNewThisWeek` is
 * the row's own age — both real signals, not flags someone set by hand.
 */
function toItem(row: ItemRow): MarketplaceItem {
  const price = Number(row.price);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    categorySlug: row.category as Category,
    creator: row.creatorId.slice(0, 8),
    creatorAvatar: '',
    price: price === 0 ? null : price,
    commercialPrice: price === 0 ? null : price * 2,
    rating: row.averageRating ?? 0,
    ratingCount: row.reviewCount ?? 0,
    downloads: row.purchaseCount,
    license: 'personal',
    gradient: gradientFor(row.id),
    description: row.description,
    included: [],
    tags: [],
    reviews: [],
    isFeatured: row.featured,
    isTrending: row.purchaseCount >= 5,
    isNewThisWeek: Date.now() - new Date(row.createdAt).getTime() < WEEK_MS,
    isFreePick: price === 0,
  };
}

export default function MarketplacePage() {
  const router = useRouter();

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
  const [userCredits, setUserCredits] = useState(850);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const shopState = useResource<ItemList>('/api/marketplace/items?limit=60');
  const libraryState = useResource<LibraryList>('/api/marketplace/library');
  const publishedState = useResource<PublishedList>('/api/marketplace/published');
  const wishlistState = useResource<ItemList>('/api/marketplace/wishlist');

  const SHOP_ITEMS = useMemo(() => (shopState.data?.items ?? []).map(toItem), [shopState.data]);
  const LIBRARY_ITEMS = useMemo(
    () =>
      (libraryState.data?.items ?? []).map((row) => ({
        ...toItem(row),
        ownedDate: row.purchasedAt,
      })),
    [libraryState.data],
  );
  const PUBLISHED_ITEMS = useMemo(
    () =>
      (publishedState.data?.items ?? []).map((row) => ({
        ...toItem(row),
        // The listing's own status, and earnings net of the platform fee.
        status: row.status as ItemStatus,
        revenue: row.revenueCents / 100,
      })),
    [publishedState.data],
  );

  const [cloningIds, setCloningIds] = useState<Set<string>>(() => new Set());
  // Ownership and the wishlist are server state, not local guesses.
  const ownedIds = useMemo(() => LIBRARY_ITEMS.map((i) => i.id), [LIBRARY_ITEMS]);
  const libraryItemIds = useMemo(() => new Set(ownedIds), [ownedIds]);
  const wishlistedIds = useMemo(
    () => new Set((wishlistState.data?.items ?? []).map((i) => i.id)),
    [wishlistState.data],
  );

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Card hover
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Grid scroll ref (MP-7: Trending/New this week quick-jump)
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Publish Wizard (MP-8)
  const [showPublishWizard, setShowPublishWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardType, setWizardType] = useState<
    'style-pack' | 'character' | 'audio-pack' | 'template' | 'workflow'
  >('style-pack');
  const [wizardSource, setWizardSource] = useState('');
  const [wizardName, setWizardName] = useState('');
  const [wizardShortDesc, setWizardShortDesc] = useState('');
  const [wizardFullDesc, setWizardFullDesc] = useState('');
  const [wizardTags, setWizardTags] = useState('');
  const [wizardPreviewFile, setWizardPreviewFile] = useState<string | null>(null);
  const [wizardIsFree, setWizardIsFree] = useState(false);
  const [wizardPrice, setWizardPrice] = useState(50);
  const [wizardLicense, setWizardLicense] = useState<'personal' | 'commercial' | 'both'>('both');

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
          i.tags.some((t) => t.includes(q)),
      );
    }

    // Price filter
    if (priceFilter === 'free') items = items.filter((i) => i.price === null);
    else if (priceFilter === 'under-50')
      items = items.filter((i) => i.price !== null && i.price < 50);
    else if (priceFilter === '50-100')
      items = items.filter((i) => i.price !== null && i.price >= 50 && i.price <= 100);
    else if (priceFilter === 'over-100')
      items = items.filter((i) => i.price !== null && i.price > 100);

    // Rating filter
    if (ratingFilter === '4plus') items = items.filter((i) => i.rating >= 4);
    else if (ratingFilter === '3plus') items = items.filter((i) => i.rating >= 3);
    else if (ratingFilter === '2plus') items = items.filter((i) => i.rating >= 2);

    // Creator filter
    if (creatorFilter === 'official') items = items.filter((i) => i.creator === 'AnimaForge');
    else if (creatorFilter === 'verified')
      items = items.filter((i) =>
        ['ArtBot', 'StyleMaster', 'CharacterLab', 'SoundForge'].includes(i.creator),
      );
    else if (creatorFilter === 'community')
      items = items.filter((i) => !['AnimaForge'].includes(i.creator));

    // License filter
    if (licenseFilter === 'personal') items = items.filter((i) => i.license === 'personal');
    else if (licenseFilter === 'commercial')
      items = items.filter((i) => i.license === 'commercial');

    // Sort
    switch (sortBy) {
      case 'popular':
        items.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'newest':
        items.sort((a, b) => (b.isNewThisWeek ? 1 : 0) - (a.isNewThisWeek ? 1 : 0));
        break;
      case 'highest-rated':
        items.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price-high':
        items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
    }

    return items;
  }, [
    activeCategory,
    searchQuery,
    sortBy,
    priceFilter,
    ratingFilter,
    creatorFilter,
    licenseFilter,
  ]);

  const trendingItems = SHOP_ITEMS.filter((i) => i.isTrending);
  const newItems = SHOP_ITEMS.filter((i) => i.isNewThisWeek);
  const freeItems = SHOP_ITEMS.filter((i) => i.isFreePick);
  const wishlistItems = SHOP_ITEMS.filter((i) => wishlistedIds.has(i.id));
  // ensure wishlistedIds Set dependency triggers for derived values

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

  const toggleWishlist = useCallback(
    async (itemId: string) => {
      // The previous version updated a local Set, then ran a `mockSuccess = true`
      // timer whose failure branch was unreachable, so the wishlist never
      // survived a refresh. POST adds, DELETE removes, then the list is re-read.
      const wasWishlisted = wishlistedIds.has(itemId);
      const { error } = await mutate(
        `/api/marketplace/wishlist/${itemId}`,
        wasWishlisted ? 'DELETE' : 'POST',
      );
      if (error) {
        toast.error(`Could not update wishlist: ${error.message}`);
        return;
      }
      if (!wasWishlisted) toast.success('Added to wishlist');
      wishlistState.reload();
    },
    [wishlistedIds, wishlistState],
  );

  const openPurchaseModal = useCallback(
    (item?: MarketplaceItem) => {
      const target = item ?? selectedItem;
      if (!target) return;
      // When opened from a card click (not detail panel), set selectedItem so modal has data
      if (item) setSelectedItem(item);
      setPurchaseLicense(target.license === 'commercial' ? 'commercial' : 'personal');
      setShowPurchaseModal(true);
    },
    [selectedItem],
  );

  const confirmPurchase = useCallback(async () => {
    if (!selectedItem) return;
    // Was a 1.5s timer that decremented a local credit counter and pushed the
    // id into an array, so a "purchase" vanished on refresh. The server owns
    // the purchase, and it is what rejects buying your own item or buying twice.
    setIsPurchasing(true);
    const { error } = await mutate('/api/marketplace/purchase', 'POST', {
      itemId: selectedItem.id,
    });
    setIsPurchasing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setShowPurchaseModal(false);
    toast.success(`Purchased "${selectedItem.name}"`);
    libraryState.reload();
    shopState.reload();
  }, [selectedItem, libraryState, shopState]);

  const addFreeToLibrary = useCallback(async () => {
    if (!selectedItem) return;
    // A free item is still a purchase row: that row is what grants library
    // access, so there is no separate "add" path to keep in sync.
    const { error } = await mutate('/api/marketplace/purchase', 'POST', {
      itemId: selectedItem.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    libraryState.reload();
    toast.success('Item added to your library', {
      action: {
        label: 'View library',
        onClick: () => setMainTab('library'),
      },
    });
  }, [selectedItem, libraryState]);

  const handleClone = useCallback(
    (item: MarketplaceItem | { id: string; name: string }) => {
      const id = item.id;
      if (libraryItemIds.has(id)) return;
      if (cloningIds.has(id)) return;

      // Start loading state
      setCloningIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      // Adding to the library is a purchase row server-side; the mock timer that
      // used to add the id locally left nothing behind on refresh.
      void (async () => {
        const { error } = await mutate('/api/marketplace/purchase', 'POST', { itemId: id });
        if (error) toast.error(error.message);
        else libraryState.reload();
        setCloningIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (error) return;
        toast.success('Item added to your library', {
          action: {
            label: 'View library',
            onClick: () => setMainTab('library'),
          },
        });
      })();
    },
    [libraryItemIds, cloningIds, libraryState],
  );

  const submitReview = useCallback(async () => {
    if (!selectedItem) return;
    if (reviewRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }
    // The success toast used to fire without a request. The endpoint only
    // accepts a review from someone who bought the item, so a non-buyer now
    // gets told why instead of being congratulated.
    const { error } = await mutate(`/api/marketplace/items/${selectedItem.id}/reviews`, 'POST', {
      rating: reviewRating,
      body: reviewText.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Review submitted');
    setReviewRating(0);
    setReviewText('');
    shopState.reload();
  }, [reviewRating, reviewText, selectedItem, shopState]);

  const purchaseAllWishlist = useCallback(async () => {
    const unpurchased = wishlistItems.filter((i) => !ownedIds.includes(i.id));
    const totalCost = unpurchased.reduce((sum, i) => sum + (i.price ?? 0), 0);
    if (totalCost > userCredits) {
      toast.error('Insufficient balance for all items');
      return;
    }
    // One request per item: the server owns pricing and rejects duplicates, so
    // there is nothing sensible to decrement locally.
    const results = await Promise.all(
      unpurchased.map((i) => mutate('/api/marketplace/purchase', 'POST', { itemId: i.id })),
    );
    const failed = results.filter((r) => r.error).length;
    libraryState.reload();
    if (failed > 0) toast.error(`${failed} of ${unpurchased.length} purchases failed`);
    else toast.success(`Purchased ${unpurchased.length} items`);
  }, [wishlistItems, ownedIds, libraryState]);

  const purchaseAllAffordable = useCallback(async () => {
    const unpurchased = wishlistItems.filter((i) => !ownedIds.includes(i.id));
    // Greedy select affordable items until balance exhausted
    const affordable: MarketplaceItem[] = [];
    let running = userCredits;
    for (const item of unpurchased) {
      const cost = item.price ?? 0;
      if (cost <= running) {
        affordable.push(item);
        running -= cost;
      }
    }
    if (affordable.length === 0) {
      toast.error('No affordable items in your wishlist');
      return;
    }
    const results = await Promise.all(
      affordable.map((i) => mutate('/api/marketplace/purchase', 'POST', { itemId: i.id })),
    );
    const failed = results.filter((r) => r.error).length;
    libraryState.reload();
    if (failed > 0) toast.error(`${failed} of ${affordable.length} purchases failed`);
    else toast.success(`Purchased ${affordable.length} affordable items`);
  }, [wishlistItems, ownedIds, userCredits, libraryState]);

  const navigateToStudio = useCallback(
    (item: MarketplaceItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const routeMap: Record<Category, string> = {
        all: '/style',
        'style-packs': '/style',
        characters: '/characters',
        audio: '/audio',
        templates: '/projects',
      };
      const route = routeMap[item.categorySlug] ?? '/projects';
      toast.success(`Opening "${item.name}" in Studio...`);
      router.push(route);
    },
    [router],
  );

  const navigateToCreator = useCallback(
    (creator: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      router.push(`/marketplace/creator/${encodeURIComponent(creator)}`);
    },
    [router],
  );

  const withdrawEarnings = useCallback((amount: number) => {
    if (amount <= 0) {
      toast.error('No earnings to withdraw');
      return;
    }
    setUserCredits((b) => b + amount);
    toast.success(`Withdrew ${amount} credits to your balance`);
  }, []);

  // ── Shared card styles ─────────────────────────────────────────
  const cardStyle = (itemId: string): React.CSSProperties => ({
    background: 'var(--bg-elevated)',
    border:
      hoveredCard === itemId ? '0.5px solid var(--border-brand)' : '0.5px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, transform 150ms ease',
    transform: hoveredCard === itemId ? 'translateY(-2px)' : 'translateY(0)',
  });

  // ── Render: Item Card ──────────────────────────────────────────
  const renderItemCard = (
    item: MarketplaceItem,
    options?: { showOwned?: boolean; showWishlistRemove?: boolean; showUseInStudio?: boolean },
  ) => (
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
            aria-label={wishlistedIds.has(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wishlistedIds.has(item.id)}
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(item.id);
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
              transition: 'background 150ms ease',
            }}
          >
            <Heart
              size={14}
              fill={wishlistedIds.has(item.id) ? 'currentColor' : 'none'}
              style={{
                color: wishlistedIds.has(item.id) ? 'var(--brand)' : 'rgba(255,255,255,0.9)',
              }}
            />
          </button>
        )}

        {/* Owned badge */}
        {options?.showOwned && (
          <span
            style={{
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
            }}
          >
            <Check size={10} /> Owned
          </span>
        )}

        {/* Wishlist remove */}
        {options?.showWishlistRemove && (
          <button
            type="button"
            aria-label="Remove from wishlist"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(item.id);
            }}
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

        {/* Creator */}
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          by{' '}
          <button
            type="button"
            onClick={(e) => navigateToCreator(item.creator, e)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-light)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              font: 'inherit',
              color: 'var(--text-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            {item.creator}
          </button>
        </p>

        {/* Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          {renderStars(item.rating, 11)}
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {item.rating.toFixed(1)}
          </span>
        </div>

        {/* Price + license + downloads */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Price badge */}
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

            {/* License pill */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 'var(--radius-md)',
                background:
                  item.license === 'commercial' ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
                color: item.license === 'commercial' ? '#22c55e' : 'var(--text-tertiary)',
                textTransform: 'capitalize',
              }}
            >
              {item.license}
            </span>
          </div>

          {/* Downloads */}
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

        {/* Clone for free button on free cards (not owned, not library view) */}
        {item.price === null &&
          !options?.showOwned &&
          !options?.showUseInStudio &&
          (() => {
            const inLibrary = libraryItemIds.has(item.id);
            const isCloning = cloningIds.has(item.id);
            return (
              <button
                type="button"
                disabled={inLibrary || isCloning}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClone(item);
                }}
                style={{
                  marginTop: 10,
                  width: '100%',
                  background: inLibrary ? 'rgba(34,197,94,0.15)' : 'var(--brand)',
                  color: inLibrary ? '#22c55e' : '#fff',
                  border: inLibrary ? '0.5px solid rgba(34,197,94,0.3)' : 'none',
                  padding: '7px 0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: inLibrary || isCloning ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {inLibrary ? (
                  <>
                    <Check size={12} /> In your library
                  </>
                ) : isCloning ? (
                  <>
                    <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Adding...
                  </>
                ) : (
                  <>
                    <Gift size={12} /> Clone for free
                  </>
                )}
              </button>
            );
          })()}

        {/* Use in Studio button for library */}
        {options?.showUseInStudio && (
          <button
            type="button"
            onClick={(e) => navigateToStudio(item, e)}
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
            <ExternalLink size={12} /> Use
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
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </span>
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'thin',
          }}
        >
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
    <div
      style={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        paddingRight: 16,
        borderRight: '0.5px solid var(--border)',
      }}
    >
      {/* Price */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Price
        </span>
        {(
          [
            ['all', 'Any price'],
            ['free', 'Free'],
            ['under-50', 'Under 50 cr'],
            ['50-100', '50–100 cr'],
            ['over-100', 'Over 100 cr'],
          ] as [PriceFilter, string][]
        ).map(([val, label]) => (
          <label
            key={val}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="radio"
              name="price"
              checked={priceFilter === val}
              onChange={() => setPriceFilter(val)}
              style={{ accentColor: 'var(--brand)' }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Rating */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Rating
        </span>
        {(
          [
            ['all', 'All ratings'],
            ['4plus', '4+ stars'],
            ['3plus', '3+ stars'],
            ['2plus', '2+ stars'],
          ] as [RatingFilter, string][]
        ).map(([val, label]) => (
          <label
            key={val}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="radio"
              name="rating"
              checked={ratingFilter === val}
              onChange={() => setRatingFilter(val)}
              style={{ accentColor: 'var(--brand)' }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Creator type */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Creator
        </span>
        {(
          [
            ['all', 'All creators'],
            ['official', 'Official'],
            ['verified', 'Verified'],
            ['community', 'Community'],
          ] as [CreatorFilter, string][]
        ).map(([val, label]) => (
          <label
            key={val}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="radio"
              name="creator"
              checked={creatorFilter === val}
              onChange={() => setCreatorFilter(val)}
              style={{ accentColor: 'var(--brand)' }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* License type */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          License
        </span>
        {(
          [
            ['all', 'All licenses'],
            ['personal', 'Personal'],
            ['commercial', 'Commercial'],
          ] as [LicenseFilter, string][]
        ).map(([val, label]) => (
          <label
            key={val}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            <input
              type="radio"
              name="license"
              checked={licenseFilter === val}
              onChange={() => setLicenseFilter(val)}
              style={{ accentColor: 'var(--brand)' }}
            />
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
    const currentPrice =
      purchaseLicense === 'commercial'
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
                  aria-label="Close"
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
                <div
                  style={{
                    height: 300,
                    background: selectedItem.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Store size={56} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px' }}>
                  {/* Name + type */}
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: '0 0 4px',
                    }}
                  >
                    {selectedItem.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        background: 'var(--bg-hover)',
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {selectedItem.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.success(`Viewing ${selectedItem.creator}'s profile`)}
                      style={{
                        fontSize: 11,
                        color: 'var(--brand)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      by {selectedItem.creator}
                    </button>
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    {renderStars(selectedItem.rating)}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedItem.rating.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      ({selectedItem.ratingCount} ratings)
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        marginLeft: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Download size={11} /> {formatDownloads(selectedItem.downloads)} downloads
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Description
                    </span>
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}
                    >
                      {selectedItem.description}
                    </p>
                  </div>

                  {/* What's included */}
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      What&apos;s included
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc' }}>
                      {selectedItem.included.map((inc, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            marginBottom: 3,
                            lineHeight: 1.5,
                          }}
                        >
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags */}
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Tags
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedItem.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-hover)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Creator info card */}
                  <button
                    type="button"
                    onClick={(e) => navigateToCreator(selectedItem.creator, e)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 14,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'var(--border-brand)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    }}
                  >
                    <div
                      style={{
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
                      }}
                    >
                      {selectedItem.creatorAvatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          display: 'block',
                        }}
                      >
                        {selectedItem.creator}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        View creator profile
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                    />
                  </button>

                  {/* License terms */}
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <Shield size={12} style={{ color: 'var(--brand)' }} /> License terms
                    </span>
                    <div
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 12,
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-hover)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          Personal:{' '}
                          {selectedItem.price === null && selectedItem.commercialPrice === null
                            ? 'Free'
                            : selectedItem.price === null
                              ? 'Free'
                              : `${selectedItem.price} cr`}
                        </span>
                        {selectedItem.commercialPrice !== null && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(34,197,94,0.15)',
                              color: '#22c55e',
                            }}
                          >
                            Commercial: {selectedItem.commercialPrice} cr
                          </span>
                        )}
                      </div>
                      Personal license allows use in non-commercial projects. Commercial license
                      grants full redistribution and monetization rights.
                    </div>
                  </div>

                  {/* Reviews section */}
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Reviews ({selectedItem.reviews.length})
                    </span>
                    {selectedItem.reviews.map((review) => (
                      <div
                        key={review.id}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '0.5px solid var(--border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {review.author}
                            </span>
                            {renderStars(review.rating, 10)}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            {review.date}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {review.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Write review (if owned) */}
                  {isOwned && (
                    <div
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 14,
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Write a review
                      </span>
                      {/* Star picker */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            aria-label={`Rate ${s} star${s !== 1 ? 's' : ''}`}
                            aria-pressed={s <= reviewRating}
                            onClick={() => setReviewRating(s)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
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
                        aria-label="Review text"
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
              <div
                style={{
                  borderTop: '0.5px solid var(--border)',
                  padding: '14px 24px',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {!isFree && !isOwned && (selectedItem.price ?? 0) > userCredits && (
                  <button
                    type="button"
                    onClick={() => toast.success('Opening credit purchase...')}
                    style={{
                      background: 'rgba(251,191,36,0.15)',
                      color: '#fbbf24',
                      border: '0.5px solid rgba(251,191,36,0.3)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      width: '100%',
                    }}
                  >
                    <DollarSign size={12} /> Insufficient balance — Buy more credits
                  </button>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: isFree ? '#22c55e' : 'var(--text-primary)',
                      }}
                    >
                      {isFree ? 'Free' : `${selectedItem.price} credits`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      Balance: {userCredits} credits
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isOwned && (
                      <button
                        type="button"
                        aria-label={
                          wishlistedIds.has(selectedItem.id)
                            ? 'Remove from wishlist'
                            : 'Add to wishlist'
                        }
                        aria-pressed={wishlistedIds.has(selectedItem.id)}
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
                          fill={wishlistedIds.has(selectedItem.id) ? 'currentColor' : 'none'}
                          style={{
                            color: wishlistedIds.has(selectedItem.id)
                              ? 'var(--brand)'
                              : 'var(--text-secondary)',
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
                        onClick={() => openPurchaseModal()}
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
    const balanceAfter = userCredits - finalPrice;

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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 4px',
              }}
            >
              Confirm Purchase
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              {selectedItem.name}
            </p>

            {/* License selector */}
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                License type
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPurchaseLicense('personal')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background:
                      purchaseLicense === 'personal' ? 'var(--bg-elevated)' : 'transparent',
                    border:
                      purchaseLicense === 'personal'
                        ? '1px solid var(--border-brand)'
                        : '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'block',
                    }}
                  >
                    Personal
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {personalPrice} credits
                  </span>
                </button>
                {selectedItem.commercialPrice !== null && (
                  <button
                    type="button"
                    onClick={() => setPurchaseLicense('commercial')}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background:
                        purchaseLicense === 'commercial' ? 'var(--bg-elevated)' : 'transparent',
                      border:
                        purchaseLicense === 'commercial'
                          ? '1px solid var(--border-brand)'
                          : '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'block',
                      }}
                    >
                      Commercial
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {commercialPrice} credits
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Balance info */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Current balance
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {userCredits} credits
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Item cost</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>
                  -{finalPrice} credits
                </span>
              </div>
              <div
                style={{
                  borderTop: '0.5px solid var(--border)',
                  paddingTop: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Balance after</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: balanceAfter >= 0 ? '#22c55e' : '#ef4444',
                  }}
                >
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
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0a2e, #1a0a3e)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fbbf24',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
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
        {(() => {
          const featuredId = 'featured-cyberpunk-neon';
          const inLibrary = libraryItemIds.has(featuredId);
          const isCloning = cloningIds.has(featuredId);
          return (
            <button
              type="button"
              disabled={inLibrary || isCloning}
              onClick={() => handleClone({ id: featuredId, name: 'Cyberpunk Neon Pack' })}
              style={{
                background: inLibrary ? 'rgba(34,197,94,0.2)' : 'var(--brand)',
                color: inLibrary ? '#4ade80' : '#ffffff',
                border: inLibrary ? '0.5px solid rgba(74,222,128,0.4)' : 'none',
                padding: '10px 22px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 600,
                cursor: inLibrary || isCloning ? 'default' : 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {inLibrary ? (
                <>
                  <Check size={14} /> In your library
                </>
              ) : isCloning ? (
                <>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Adding...
                </>
              ) : (
                <>
                  <Gift size={14} /> Clone for free
                </>
              )}
            </button>
          );
        })()}
      </div>

      {/* Search bar */}
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
          marginBottom: 12,
        }}
      >
        <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          aria-label="Search marketplace"
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveCategory(tab.value)}
              style={{
                background: activeCategory === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color:
                  activeCategory === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border:
                  activeCategory === tab.value
                    ? '0.5px solid var(--border)'
                    : '0.5px solid transparent',
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
            <div
              style={{
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
              {renderScrollSection(
                'Trending this week',
                <TrendingUp size={14} style={{ color: '#f43f5e' }} />,
                trendingItems,
              )}
              {renderScrollSection(
                'New this week',
                <Clock size={14} style={{ color: '#3b82f6' }} />,
                newItems,
              )}
              {renderScrollSection(
                'Free picks',
                <Gift size={14} style={{ color: '#22c55e' }} />,
                freeItems,
              )}
            </>
          )}

          {/* All items grid */}
          <div style={{ marginTop: 4 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'block',
                marginBottom: 10,
              }}
            >
              {searchQuery.trim()
                ? `Search results (${filteredShopItems.length})`
                : `All items (${filteredShopItems.length})`}
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {shopState.loading && shopState.data === null
                ? null
                : filteredShopItems.map((item) => renderItemCard(item))}
            </div>
            {shopState.loading && shopState.data === null ? (
              <LoadingState label="Loading the marketplace…" />
            ) : shopState.error ? (
              <ErrorState error={shopState.error} onRetry={shopState.reload} />
            ) : null}
            {!shopState.loading && !shopState.error && filteredShopItems.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                }}
              >
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
    const libraryItems = LIBRARY_ITEMS.filter(
      (i) => libraryFilter === 'all' || i.categorySlug === libraryFilter,
    );
    // Also include dynamically purchased items
    const dynamicOwned = SHOP_ITEMS.filter(
      (i) => ownedIds.includes(i.id) && !LIBRARY_ITEMS.some((li) => li.id === i.id),
    );
    const allLibrary = [...libraryItems, ...dynamicOwned].filter(
      (i) => libraryFilter === 'all' || i.categorySlug === libraryFilter,
    );

    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
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
                  color:
                    libraryFilter === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border:
                    libraryFilter === tab.value
                      ? '0.5px solid var(--border)'
                      : '0.5px solid transparent',
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
        {allLibrary.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {allLibrary.map((item) =>
              renderItemCard(item, { showOwned: true, showUseInStudio: true }),
            )}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Your library is empty"
            description="Items you purchase or add from the marketplace will appear here, ready to use in any studio."
            action={{
              label: 'Browse shop',
              onClick: () => setMainTab('shop'),
            }}
          />
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
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: 'Total Earnings',
              value: `${totalEarnings} cr`,
              icon: <DollarSign size={14} style={{ color: '#22c55e' }} />,
              bg: 'rgba(34,197,94,0.1)',
            },
            {
              label: 'Total Downloads',
              value: formatDownloads(totalDownloads),
              icon: <Download size={14} style={{ color: '#3b82f6' }} />,
              bg: 'rgba(59,130,246,0.1)',
            },
            {
              label: 'Published Items',
              value: String(PUBLISHED_ITEMS.length),
              icon: <Package size={14} style={{ color: '#a855f7' }} />,
              bg: 'rgba(168,85,247,0.1)',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stat.icon}
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Published items list */}
        {PUBLISHED_ITEMS.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Preview */}
            <div
              style={{
                width: 80,
                height: 60,
                borderRadius: 'var(--radius-lg)',
                background: item.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Store size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-md)',
                    background: `${statusColor(item.status)}20`,
                    color: statusColor(item.status),
                    textTransform: 'uppercase',
                  }}
                >
                  {item.status}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
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
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
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
    const totalCost = wishlistItems
      .filter((i) => !ownedIds.includes(i.id))
      .reduce((sum, i) => sum + (i.price ?? 0), 0);

    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
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
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
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
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ShoppingCart size={12} /> {userCredits} credits
            </span>
            <button
              type="button"
              onClick={() => {
                setMainTab('published');
                toast.success('Create a new listing from My Published tab');
              }}
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
              <Store size={13} /> Publish
            </button>
          </div>
        </div>

        {/* Main Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 20,
            borderBottom: '0.5px solid var(--border)',
          }}
        >
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
                {tab.value === 'wishlist' && wishlistedIds.size > 0 && (
                  <span
                    style={{
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
                    }}
                  >
                    {wishlistedIds.size}
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
