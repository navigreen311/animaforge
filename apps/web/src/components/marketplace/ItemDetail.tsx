'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMarketplaceStore, type MarketplaceItem, type MarketplaceReview } from '@/stores/marketplaceStore';

const CATEGORY_LABELS: Record<string, string> = {
  'style-packs': 'Style Pack',
  templates: 'Template',
  characters: 'Character',
  'audio-packs': 'Audio Pack',
};

const MOCK_REVIEWS: MarketplaceReview[] = [
  {
    id: 'r-1',
    itemId: 'mp-1',
    userId: 'u-10',
    userName: 'AnimatorPro',
    rating: 5,
    comment: 'Incredible quality! The neon effects are exactly what I needed for my sci-fi short.',
    createdAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'r-2',
    itemId: 'mp-1',
    userId: 'u-11',
    userName: 'StudioNova',
    rating: 4,
    comment: 'Great pack overall. Would love to see more rain variations in the next update.',
    createdAt: '2026-03-08T14:30:00Z',
  },
  {
    id: 'r-3',
    itemId: 'mp-1',
    userId: 'u-12',
    userName: 'PixelDreamer',
    rating: 5,
    comment: 'Used this for a music video project. The holographic overlays are stunning.',
    createdAt: '2026-03-05T20:00:00Z',
  },
];

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface ItemDetailProps {
  item: MarketplaceItem;
  onBack?: () => void;
  relatedItems?: MarketplaceItem[];
}

export default function ItemDetail({ item, onBack, relatedItems = [] }: ItemDetailProps) {
  const { addToCart, cart } = useMarketplaceStore();
  const [activePreview, setActivePreview] = useState(0);
  const isInCart = cart.some((c) => c.itemId === item.id);
  const isFree = item.price === 0;

  return (
    <div className="space-y-8">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </button>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Preview area */}
        <div className="space-y-4 lg:col-span-2">
          {/* Main preview */}
          <Card className="aspect-video w-full overflow-hidden">
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-[var(--color-text-muted)]">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="mt-2 text-sm opacity-50">Preview {activePreview + 1}</p>
              </div>
            </div>
          </Card>

          {/* Preview thumbnails */}
          {item.previewImages.length > 1 && (
            <div className="flex gap-2">
              {item.previewImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePreview(idx)}
                  className={`h-16 w-24 rounded-lg border-2 transition-colors ${
                    activePreview === idx
                      ? 'border-primary'
                      : 'border-[var(--color-border)] hover:border-primary/50'
                  } overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900`}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-xs text-[var(--color-text-muted)]">{idx + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-[var(--color-text)]">{item.name}</h1>
          </div>

          {/* Creator info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {item.creatorName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{item.creatorName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Creator</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <StarDisplay rating={item.rating} size="md" />
              <span className="ml-1 text-sm text-[var(--color-text)]">{item.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">
              {item.reviewCount} reviews
            </span>
          </div>

          <p className="text-sm text-[var(--color-text-muted)]">
            {item.downloadCount.toLocaleString()} downloads
          </p>

          {/* Price & action */}
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-surface p-4">
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {isFree ? 'Free' : `$${item.price.toFixed(2)}`}
            </p>
            {isFree ? (
              <Button size="lg" className="w-full">
                Download
              </Button>
            ) : isInCart ? (
              <Button size="lg" variant="secondary" className="w-full" disabled>
                Added to Cart
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={() => addToCart(item.id)}>
                Add to Cart
              </Button>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Description</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{item.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
          Reviews ({item.reviewCount})
        </h2>
        <div className="space-y-4">
          {MOCK_REVIEWS.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[var(--color-text)]">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{review.userName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StarDisplay rating={review.rating} />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{review.comment}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Related items */}
      {relatedItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">Related Items</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedItems.map((related) => (
              <Card key={related.id} className="cursor-pointer overflow-hidden transition-all hover:border-primary/50">
                <div className="aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900" />
                <div className="p-3">
                  <h4 className="truncate text-sm font-medium text-[var(--color-text)]">{related.name}</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">by {related.creatorName}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-text)]">
                    {related.price === 0 ? 'Free' : `$${related.price.toFixed(2)}`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
