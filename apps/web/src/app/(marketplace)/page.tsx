'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMarketplaceStore, type MarketplaceCategory, type MarketplaceItem } from '@/stores/marketplaceStore';
import SearchBar from '@/components/marketplace/SearchBar';
import ItemCard from '@/components/marketplace/ItemCard';
import ItemDetail from '@/components/marketplace/ItemDetail';

const CATEGORY_TABS: { value: MarketplaceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'style-packs', label: 'Style Packs' },
  { value: 'templates', label: 'Templates' },
  { value: 'characters', label: 'Characters' },
  { value: 'audio-packs', label: 'Audio Packs' },
];

export default function MarketplacePage() {
  const { items, featured, filters, isLoading, fetchItems, setFilters } = useMarketplaceStore();
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-rotate featured carousel
  useEffect(() => {
    if (featured.length === 0) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % featured.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featured.length]);

  const handleCategoryTab = useCallback(
    (cat: MarketplaceCategory | 'all') => {
      setFilters({ category: cat });
    },
    [setFilters],
  );

  // Show item detail view
  if (selectedItem) {
    const related = items.filter(
      (i) => i.category === selectedItem.category && i.id !== selectedItem.id,
    ).slice(0, 3);
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ItemDetail
          item={selectedItem}
          onBack={() => setSelectedItem(null)}
          relatedItems={related}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero section */}
      <section className="mb-12 text-center">
        <h1 className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
          AnimaForge Creator Marketplace
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-muted)]">
          Discover style packs, templates, characters, and audio packs created by the community.
          Sell your own creations and earn a 70% revenue share.
        </p>
      </section>

      {/* Featured items carousel */}
      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Featured</h2>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
            <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="min-w-full cursor-pointer p-6"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                    {/* Preview placeholder */}
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <svg className="h-16 w-16 opacity-20 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                    {/* Info */}
                    <div className="space-y-3">
                      <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                        Featured
                      </span>
                      <h3 className="text-2xl font-bold text-[var(--color-text)]">{item.name}</h3>
                      <p className="text-sm text-[var(--color-text-muted)]">{item.description}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-[var(--color-text)]">
                          {item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`}
                        </span>
                        <span className="text-sm text-[var(--color-text-muted)]">by {item.creatorName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 pb-4">
              {featured.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    idx === carouselIndex ? 'bg-primary' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Search bar */}
      <section className="mb-8">
        <SearchBar />
      </section>

      {/* Category tabs */}
      <section className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleCategoryTab(tab.value)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filters.category === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Items grid */}
      <section>
        {isLoading ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            <p className="text-lg">No items found</p>
            <p className="mt-2 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
