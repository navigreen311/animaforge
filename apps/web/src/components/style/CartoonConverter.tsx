'use client';

import { useState } from 'react';
import { useStyleStore, type CartoonStyle } from '@/stores/styleStore';

const STYLES: { value: CartoonStyle; label: string }[] = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'anime', label: 'Anime' },
  { value: 'cel', label: 'Cel Shading' },
  { value: 'pixel art', label: 'Pixel Art' },
];

const PIPELINE_STAGES = [
  'Preprocessing',
  'Edge Detection',
  'Color Quantization',
  'Style Transfer',
  'Detail Refinement',
  'Post-processing',
  'Final Render',
] as const;

export function CartoonConverter() {
  const [imageUrl, setImageUrl] = useState('');
  const [style, setStyle] = useState<CartoonStyle>('cartoon');
  const [strength, setStrength] = useState(0.7);
  const [pipelineStage, setPipelineStage] = useState(-1);
  const { convertToCartoon, cartoonResult, cartoonJobId } = useStyleStore();

  const isConverting = cartoonJobId !== null && cartoonResult === null;

  const handleConvert = () => {
    if (!imageUrl.trim()) return;
    convertToCartoon(imageUrl.trim(), style, strength);

    // Simulate 7-stage pipeline progress
    let stage = 0;
    const interval = setInterval(() => {
      setPipelineStage(stage);
      stage++;
      if (stage >= PIPELINE_STAGES.length) {
        clearInterval(interval);
        setTimeout(() => setPipelineStage(-1), 500);
      }
    }, 400);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Image URL Input */}
      <div className="space-y-1">
        <label htmlFor="image-url" className="block text-sm font-medium text-zinc-300">
          Image URL
        </label>
        <input
          id="image-url"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          disabled={isConverting}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
      </div>

      {/* Style Dropdown */}
      <div className="space-y-1">
        <label htmlFor="cartoon-style" className="block text-sm font-medium text-zinc-300">
          Style
        </label>
        <select
          id="cartoon-style"
          value={style}
          onChange={(e) => setStyle(e.target.value as CartoonStyle)}
          disabled={isConverting}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-500 disabled:opacity-50"
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Strength Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="strength-slider" className="text-sm font-medium text-zinc-300">
            Strength
          </label>
          <span className="text-sm font-mono text-zinc-400">{strength.toFixed(2)}</span>
        </div>
        <input
          id="strength-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          disabled={isConverting}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>0.0 (Subtle)</span>
          <span>1.0 (Full)</span>
        </div>
      </div>

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        disabled={isConverting || !imageUrl.trim()}
        className="self-start rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConverting ? 'Converting...' : 'Convert'}
      </button>

      {/* 7-Stage Pipeline Progress */}
      {isConverting && pipelineStage >= 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Pipeline Progress
          </h4>
          <div className="grid grid-cols-7 gap-1.5">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage} className="flex flex-col items-center gap-1">
                <div
                  className={`h-2 w-full rounded-full transition-colors ${
                    i <= pipelineStage
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                      : 'bg-zinc-800'
                  }`}
                />
                <span
                  className={`text-[10px] text-center leading-tight ${
                    i <= pipelineStage ? 'text-violet-400' : 'text-zinc-600'
                  }`}
                >
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Before / After Comparison */}
      {cartoonResult && !isConverting && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-300">Result</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-500">Before</span>
              <div className="flex aspect-video items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
                <span className="text-xs text-zinc-500">Original Image</span>
              </div>
            </div>
            {/* After */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-500">
                After &mdash; {cartoonResult.style} @ {(cartoonResult.strength * 100).toFixed(0)}%
              </span>
              <div className="flex aspect-video items-center justify-center rounded-lg border border-violet-800 bg-violet-950/30">
                <span className="text-xs text-violet-400">Cartoon Result</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
