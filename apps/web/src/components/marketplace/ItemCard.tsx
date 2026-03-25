'use client';

import { Card } from '@/components/ui/Card';
import type { MarketplaceItem } from '@/stores/marketplaceStore';

const CATEGORY_LABELS: Record<string, string> = {
  'style-packs': 'Style Pack',
  templates: 'Template',
  characters: 'Character',
  'audio-packs': 'Audio Pack',
};

const CATEGORY_COLORS: Record<string, string> = {
  'style-packs': 'bg-purple-600/80',
  templates: 'bg-blue-600/80',
  characters: 'bg-emerald-600/80',
  'audio-packs': 'bg-amber-600/80',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-[var(--color-text-muted)]">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

interface ItemCardProps {
  item: MarketplaceItem;
  onClick?: (item: MarketplaceItem) => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
      onClick={() => onClick?.(item)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-surface">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-[var(--color-text-muted)]">
          <svg className="h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>

        {/* Category badge */}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${CATEGORY_COLORS[item.category] ?? 'bg-gray-600/80'}`}
        >
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 p-4">
        <h3 className="truncate text-sm font-semibold text-[var(--color-text)] group-hover:text-primary transition-colors">
          {item.name}
        </h3>

        <p className="text-xs text-[var(--color-text-muted)]">by {item.creatorName}</p>

        <div className="flex items-center justify-between">
          <StarRating rating={item.rating} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {item.downloadCount.toLocaleString()} downloads
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-[var(--color-text)]">
            {item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </Card>
  );
}
