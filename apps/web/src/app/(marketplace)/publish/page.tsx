'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useMarketplaceStore, type MarketplaceCategory } from '@/stores/marketplaceStore';

const CATEGORIES: { value: MarketplaceCategory; label: string }[] = [
  { value: 'style-packs', label: 'Style Pack' },
  { value: 'templates', label: 'Template' },
  { value: 'characters', label: 'Character' },
  { value: 'audio-packs', label: 'Audio Pack' },
];

export default function PublishPage() {
  const { publishItem } = useMarketplaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('style-packs');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    if (!isFree && (!price || isNaN(Number(price)) || Number(price) <= 0)) {
      newErrors.price = 'Enter a valid price or mark as free.';
    }
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    publishItem({
      name: name.trim(),
      description: description.trim(),
      category,
      price: isFree ? 0 : Number(price),
      previewImages,
    });

    setSubmitted(true);
  };

  const handleAddPreview = () => {
    setPreviewImages((prev) => [...prev, `/uploads/preview-${prev.length + 1}.webp`]);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Item Submitted!</h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Your item is now under review. You will be notified once it is approved and live on the marketplace.
        </p>
        <Button
          className="mt-8"
          onClick={() => {
            setSubmitted(false);
            setName('');
            setDescription('');
            setPrice('');
            setIsFree(false);
            setPreviewImages([]);
            setAgreedToTerms(false);
          }}
        >
          Publish Another
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">Publish to Marketplace</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Share your creations with the AnimaForge community and earn from every sale.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <Input
          label="Item Name"
          placeholder="e.g. Cyberpunk Neon Style Pack"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--color-text)]">
            Description
          </label>
          <textarea
            rows={4}
            placeholder="Describe your item, what it includes, and how to use it..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-bg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--color-text)]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-bg px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text)]">Pricing</label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] bg-bg text-primary focus:ring-primary"
            />
            Offer for free
          </label>
          {!isFree && (
            <Input
              label="Price (USD)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="9.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.price}
            />
          )}
        </div>

        {/* Preview images */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text)]">Preview Images</label>
          <div className="flex flex-wrap gap-3">
            {previewImages.map((_, idx) => (
              <div
                key={idx}
                className="flex h-24 w-32 items-center justify-center rounded-lg border border-[var(--color-border)] bg-gradient-to-br from-gray-800 to-gray-900"
              >
                <span className="text-xs text-[var(--color-text-muted)]">Preview {idx + 1}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddPreview}
              className="flex h-24 w-32 items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-primary hover:text-primary"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terms */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Revenue Split Terms</h3>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              By publishing on the AnimaForge Creator Marketplace, you agree to a <strong className="text-[var(--color-text)]">70/30 revenue split</strong>.
              You receive 70% of each sale. AnimaForge retains 30% to cover platform fees, payment processing, and infrastructure costs.
            </p>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border)] bg-bg text-primary focus:ring-primary"
              />
              I agree to the 70/30 revenue split and marketplace terms
            </label>
            {errors.terms && (
              <p className="mt-1 text-xs text-red-500">{errors.terms}</p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full">
          Publish Item
        </Button>
      </form>
    </div>
  );
}
