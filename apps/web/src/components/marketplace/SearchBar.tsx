'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { useMarketplaceStore, type MarketplaceCategory, type PriceRange, type SortBy } from '@/stores/marketplaceStore';

const CATEGORIES: { value: MarketplaceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'style-packs', label: 'Style Packs' },
  { value: 'templates', label: 'Templates' },
  { value: 'characters', label: 'Characters' },
  { value: 'audio-packs', label: 'Audio Packs' },
];

const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'Any Price' },
  { value: 'free', label: 'Free' },
  { value: 'under5', label: 'Under $5' },
  { value: '5to20', label: '$5 - $20' },
  { value: 'over20', label: '$20+' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function SearchBar() {
  const { filters, searchQuery, setFilters, searchItems, setSearchQuery } = useMarketplaceStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = useCallback(() => {
    setSearchQuery(localQuery);
    if (localQuery.trim()) {
      searchItems(localQuery);
    } else {
      useMarketplaceStore.getState().fetchItems();
    }
  }, [localQuery, setSearchQuery, searchItems]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch],
  );

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search packs, templates, characters..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Search
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ category: e.target.value as MarketplaceCategory | 'all' })}
          className="rounded-lg border border-[var(--color-border)] bg-bg px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={filters.priceRange}
          onChange={(e) => setFilters({ priceRange: e.target.value as PriceRange })}
          className="rounded-lg border border-[var(--color-border)] bg-bg px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PRICE_RANGES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value as SortBy })}
          className="rounded-lg border border-[var(--color-border)] bg-bg px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
