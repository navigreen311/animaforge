'use client';

import { useEffect, useState } from 'react';
import { useStyleStore, type StylePack } from '@/stores/styleStore';

type PriceFilter = 'all' | 'free' | 'paid';
type SourceFilter = 'all' | 'video' | 'animation';

export function StyleLibrary() {
  const { stylePacks, fetchStyleLibrary } = useStyleStore();
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  useEffect(() => {
    fetchStyleLibrary();
  }, [fetchStyleLibrary]);

  const filtered = stylePacks.filter((pack) => {
    if (priceFilter === 'free' && pack.price > 0) return false;
    if (priceFilter === 'paid' && pack.price === 0) return false;
    if (sourceFilter !== 'all' && pack.sourceType !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Source Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Source:</span>
          {(['all', 'video', 'animation'] as SourceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                sourceFilter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Price Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Price:</span>
          {(['all', 'free', 'paid'] as PriceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPriceFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                priceFilter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
          No style packs match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((pack) => (
            <StylePackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Style Pack Card                                                    */
/* ------------------------------------------------------------------ */

function StylePackCard({ pack }: { pack: StylePack }) {
  const { setActiveFingerprint } = useStyleStore();

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700">
      {/* Thumbnail */}
      <div className="flex aspect-video items-center justify-center bg-zinc-800">
        <span className="text-xs text-zinc-500">{pack.name}</span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">{pack.name}</h4>
            <p className="text-xs text-zinc-500">by {pack.creator}</p>
          </div>
          {/* Source Type Badge */}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              pack.sourceType === 'video'
                ? 'bg-blue-900/50 text-blue-400'
                : 'bg-amber-900/50 text-amber-400'
            }`}
          >
            {pack.sourceType}
          </span>
        </div>

        {/* Price */}
        <span className="text-sm font-medium text-zinc-200">
          {pack.price === 0 ? 'Free' : `$${pack.price.toFixed(2)}`}
        </span>

        {/* Apply Button */}
        <button
          onClick={() => setActiveFingerprint(pack.fingerprintId)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
        >
          Apply to Project
        </button>
      </div>
    </div>
  );
}
