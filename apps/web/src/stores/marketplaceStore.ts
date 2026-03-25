import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Marketplace Types                                                  */
/* ------------------------------------------------------------------ */

export type MarketplaceCategory =
  | 'style-packs'
  | 'templates'
  | 'characters'
  | 'audio-packs';

export type PriceRange = 'all' | 'free' | 'under5' | '5to20' | 'over20';

export type SortBy = 'newest' | 'popular' | 'price-asc' | 'price-desc';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  price: number; // 0 = free
  creatorId: string;
  creatorName: string;
  thumbnailUrl: string;
  previewImages: string[];
  rating: number;
  reviewCount: number;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  thumbnailUrl: string;
}

export interface MyListing {
  id: string;
  name: string;
  category: MarketplaceCategory;
  price: number;
  sales: number;
  revenue: number;
  status: 'active' | 'draft' | 'under-review' | 'suspended';
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'processing';
}

export interface PublishItemData {
  name: string;
  description: string;
  category: MarketplaceCategory;
  price: number;
  previewImages: string[];
}

export interface MarketplaceFilters {
  category: MarketplaceCategory | 'all';
  priceRange: PriceRange;
  sortBy: SortBy;
}

/* ------------------------------------------------------------------ */
/*  State & Actions                                                    */
/* ------------------------------------------------------------------ */

interface MarketplaceState {
  items: MarketplaceItem[];
  featured: MarketplaceItem[];
  myListings: MyListing[];
  cart: CartItem[];
  searchQuery: string;
  filters: MarketplaceFilters;
  isLoading: boolean;
  payoutHistory: PayoutRecord[];
}

interface MarketplaceActions {
  fetchItems: (filters?: Partial<MarketplaceFilters>) => void;
  searchItems: (query: string) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  publishItem: (data: PublishItemData) => void;
  fetchMyListings: () => void;
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  setSearchQuery: (query: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_ITEMS: MarketplaceItem[] = [
  {
    id: 'mp-1',
    name: 'Cyberpunk Neon Style Pack',
    description: 'High-fidelity cyberpunk neon visuals with glowing edges, rain-slicked streets, and holographic overlays.',
    category: 'style-packs',
    price: 12.99,
    creatorId: 'u-1',
    creatorName: 'NeonArtist',
    thumbnailUrl: '/marketplace/cyberpunk-pack.webp',
    previewImages: ['/marketplace/cyberpunk-1.webp', '/marketplace/cyberpunk-2.webp'],
    rating: 4.8,
    reviewCount: 124,
    downloadCount: 2340,
    tags: ['cyberpunk', 'neon', 'sci-fi'],
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'mp-2',
    name: 'Studio Ghibli Inspired Template',
    description: 'Soft watercolor backgrounds, expressive characters, and whimsical environments reminiscent of classic anime films.',
    category: 'templates',
    price: 0,
    creatorId: 'u-2',
    creatorName: 'GhibliDreams',
    thumbnailUrl: '/marketplace/ghibli-template.webp',
    previewImages: ['/marketplace/ghibli-1.webp'],
    rating: 4.9,
    reviewCount: 312,
    downloadCount: 8700,
    tags: ['anime', 'ghibli', 'watercolor'],
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'mp-3',
    name: 'Heroic Fantasy Character Pack',
    description: 'A set of 20 ready-to-use fantasy characters: warriors, mages, rogues, and mythical creatures.',
    category: 'characters',
    price: 19.99,
    creatorId: 'u-3',
    creatorName: 'FantasyForge',
    thumbnailUrl: '/marketplace/fantasy-chars.webp',
    previewImages: ['/marketplace/fantasy-1.webp', '/marketplace/fantasy-2.webp'],
    rating: 4.5,
    reviewCount: 89,
    downloadCount: 1560,
    tags: ['fantasy', 'characters', 'rpg'],
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-20T11:00:00Z',
  },
  {
    id: 'mp-4',
    name: 'Cinematic Orchestral SFX',
    description: 'Over 200 royalty-free orchestral hits, swells, and ambient soundscapes for cinematic productions.',
    category: 'audio-packs',
    price: 24.99,
    creatorId: 'u-4',
    creatorName: 'SonicCraft',
    thumbnailUrl: '/marketplace/orchestral-sfx.webp',
    previewImages: ['/marketplace/orchestral-1.webp'],
    rating: 4.7,
    reviewCount: 67,
    downloadCount: 980,
    tags: ['audio', 'orchestral', 'sfx', 'cinematic'],
    createdAt: '2026-02-28T16:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'mp-5',
    name: 'Pixel Art Retro Pack',
    description: 'Retro 8-bit and 16-bit style presets with authentic CRT scan-line effects.',
    category: 'style-packs',
    price: 4.99,
    creatorId: 'u-5',
    creatorName: 'RetroPixelz',
    thumbnailUrl: '/marketplace/pixel-retro.webp',
    previewImages: ['/marketplace/pixel-1.webp'],
    rating: 4.3,
    reviewCount: 45,
    downloadCount: 720,
    tags: ['pixel', 'retro', '8-bit'],
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-18T12:00:00Z',
  },
  {
    id: 'mp-6',
    name: 'Horror Scene Template',
    description: 'Dark atmospheric templates with fog, shadows, and eerie lighting for horror productions.',
    category: 'templates',
    price: 9.99,
    creatorId: 'u-6',
    creatorName: 'DarkVisions',
    thumbnailUrl: '/marketplace/horror-template.webp',
    previewImages: ['/marketplace/horror-1.webp'],
    rating: 4.6,
    reviewCount: 58,
    downloadCount: 1100,
    tags: ['horror', 'dark', 'atmospheric'],
    createdAt: '2026-02-14T18:00:00Z',
    updatedAt: '2026-03-12T09:00:00Z',
  },
];

const MOCK_LISTINGS: MyListing[] = [
  {
    id: 'ml-1',
    name: 'Cyberpunk Neon Style Pack',
    category: 'style-packs',
    price: 12.99,
    sales: 234,
    revenue: 2128.26,
    status: 'active',
    createdAt: '2026-02-10T12:00:00Z',
  },
  {
    id: 'ml-2',
    name: 'Ambient Rain Loop',
    category: 'audio-packs',
    price: 0,
    sales: 1450,
    revenue: 0,
    status: 'active',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'ml-3',
    name: 'Noir Detective Template',
    category: 'templates',
    price: 7.99,
    sales: 56,
    revenue: 313.21,
    status: 'under-review',
    createdAt: '2026-03-18T14:00:00Z',
  },
];

const MOCK_PAYOUTS: PayoutRecord[] = [
  { id: 'po-1', amount: 1489.78, date: '2026-03-01T00:00:00Z', status: 'paid' },
  { id: 'po-2', amount: 651.42, date: '2026-02-01T00:00:00Z', status: 'paid' },
  { id: 'po-3', amount: 300.27, date: '2026-03-15T00:00:00Z', status: 'processing' },
];

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>((set, get) => ({
  items: MOCK_ITEMS,
  featured: MOCK_ITEMS.filter((i) => i.rating >= 4.7),
  myListings: [],
  cart: [],
  searchQuery: '',
  filters: {
    category: 'all',
    priceRange: 'all',
    sortBy: 'newest',
  },
  isLoading: false,
  payoutHistory: [],

  fetchItems: (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ filters: merged, isLoading: true });

    // Simulate API call with local filtering
    let filtered = [...MOCK_ITEMS];

    if (merged.category !== 'all') {
      filtered = filtered.filter((i) => i.category === merged.category);
    }

    if (merged.priceRange === 'free') filtered = filtered.filter((i) => i.price === 0);
    else if (merged.priceRange === 'under5') filtered = filtered.filter((i) => i.price > 0 && i.price < 5);
    else if (merged.priceRange === '5to20') filtered = filtered.filter((i) => i.price >= 5 && i.price <= 20);
    else if (merged.priceRange === 'over20') filtered = filtered.filter((i) => i.price > 20);

    if (merged.sortBy === 'newest') filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (merged.sortBy === 'popular') filtered.sort((a, b) => b.downloadCount - a.downloadCount);
    else if (merged.sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (merged.sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);

    setTimeout(() => set({ items: filtered, isLoading: false }), 300);
  },

  searchItems: (query) => {
    set({ searchQuery: query, isLoading: true });
    const lower = query.toLowerCase();
    const results = MOCK_ITEMS.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        i.description.toLowerCase().includes(lower) ||
        i.tags.some((t) => t.toLowerCase().includes(lower)),
    );
    setTimeout(() => set({ items: results, isLoading: false }), 300);
  },

  addToCart: (id) => {
    const item = MOCK_ITEMS.find((i) => i.id === id);
    if (!item) return;
    const already = get().cart.find((c) => c.itemId === id);
    if (already) return;
    set((state) => ({
      cart: [
        ...state.cart,
        { itemId: item.id, name: item.name, price: item.price, thumbnailUrl: item.thumbnailUrl },
      ],
    }));
  },

  removeFromCart: (id) =>
    set((state) => ({ cart: state.cart.filter((c) => c.itemId !== id) })),

  clearCart: () => set({ cart: [] }),

  publishItem: (data) => {
    const newListing: MyListing = {
      id: `ml-${Date.now()}`,
      name: data.name,
      category: data.category,
      price: data.price,
      sales: 0,
      revenue: 0,
      status: 'under-review',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ myListings: [...state.myListings, newListing] }));
  },

  fetchMyListings: () => {
    set({ isLoading: true });
    setTimeout(() => set({ myListings: MOCK_LISTINGS, payoutHistory: MOCK_PAYOUTS, isLoading: false }), 300);
  },

  setFilters: (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ filters: merged });
    get().fetchItems(merged);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
