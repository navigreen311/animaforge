'use client';

import { useState } from 'react';
import { useStyleStore } from '@/stores/styleStore';
import { FingerprintViewer } from './FingerprintViewer';

type SourceType = 'video' | 'animation';

export function StyleCloner() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('video');
  const { cloneStyle, isCloning, activeFingerprint } = useStyleStore();

  const handleExtract = () => {
    if (!sourceUrl.trim()) return;
    cloneStyle(sourceUrl.trim(), sourceType);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* URL Input */}
      <div className="space-y-1">
        <label htmlFor="source-url" className="block text-sm font-medium text-zinc-300">
          Source URL
        </label>
        <input
          id="source-url"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          disabled={isCloning}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
      </div>

      {/* Source Type Toggle */}
      <div className="space-y-1">
        <span className="block text-sm font-medium text-zinc-300">Source Type</span>
        <div className="flex gap-2">
          {(['video', 'animation'] as SourceType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSourceType(type)}
              disabled={isCloning}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                sourceType === type
                  ? 'bg-violet-600 text-white'
                  : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              } disabled:opacity-50`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Extract Button */}
      <button
        onClick={handleExtract}
        disabled={isCloning || !sourceUrl.trim()}
        className="self-start rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCloning ? 'Extracting...' : 'Extract Style'}
      </button>

      {/* Progress Indicator */}
      {isCloning && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <svg
              className="h-4 w-4 animate-spin text-violet-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Analyzing source and extracting style fingerprint...
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-2/3" />
          </div>
        </div>
      )}

      {/* Result */}
      {activeFingerprint && !isCloning && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-emerald-800 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-400">
            Style fingerprint extracted successfully.
          </div>
          <FingerprintViewer fingerprint={activeFingerprint} />
        </div>
      )}
    </div>
  );
}
