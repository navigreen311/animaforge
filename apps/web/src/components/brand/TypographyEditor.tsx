'use client';

import { useState } from 'react';

interface TypographySize {
  label: string;
  value: number;
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  sizes: TypographySize[];
}

interface TypographyEditorProps {
  typography: TypographyConfig;
  onChange: (typography: TypographyConfig) => void;
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
  'Lato', 'Raleway', 'Playfair Display', 'Merriweather',
  'Source Code Pro', 'JetBrains Mono', 'Space Grotesk',
];

const DEFAULT_SIZES: TypographySize[] = [
  { label: 'Display', value: 48 },
  { label: 'H1', value: 36 },
  { label: 'H2', value: 30 },
  { label: 'H3', value: 24 },
  { label: 'Body', value: 16 },
  { label: 'Caption', value: 12 },
];

export default function TypographyEditor({ typography, onChange }: TypographyEditorProps) {
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');

  const sizes = typography.sizes.length > 0 ? typography.sizes : DEFAULT_SIZES;

  const updateFont = (key: 'headingFont' | 'bodyFont', value: string) => {
    onChange({ ...typography, [key]: value });
  };

  const updateSize = (index: number, value: number) => {
    const next = [...sizes];
    next[index] = { ...next[index], value };
    onChange({ ...typography, sizes: next });
  };

  return (
    <div className="space-y-6">
      {/* Font selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Heading Font</label>
          <select
            value={typography.headingFont}
            onChange={(e) => updateFont('headingFont', e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Body Font</label>
          <select
            value={typography.bodyFont}
            onChange={(e) => updateFont('bodyFont', e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Size scale editor */}
      <div>
        <p className="text-xs text-gray-400 mb-3">Type Scale</p>
        <div className="space-y-3">
          {sizes.map((size, i) => (
            <div key={size.label} className="flex items-center gap-4">
              <span className="w-16 text-xs text-gray-500 font-medium">{size.label}</span>
              <input
                type="range"
                min={8}
                max={72}
                value={size.value}
                onChange={(e) => updateSize(i, Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <input
                type="number"
                min={8}
                max={72}
                value={size.value}
                onChange={(e) => updateSize(i, Number(e.target.value))}
                className="w-16 rounded-lg bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-gray-100 text-center font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-600">px</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview text input */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Preview Text</label>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Live preview */}
      <div className="rounded-xl bg-gray-800/60 p-5 space-y-4">
        <p className="text-xs text-gray-400 mb-2">Preview</p>
        {sizes.map((size) => (
          <div key={size.label} className="flex items-baseline gap-3">
            <span className="text-[10px] text-gray-600 w-14 flex-shrink-0">
              {size.label} ({size.value}px)
            </span>
            <p
              className="text-gray-100 leading-tight truncate"
              style={{
                fontFamily: size.label.startsWith('H') || size.label === 'Display'
                  ? typography.headingFont
                  : typography.bodyFont,
                fontSize: `${size.value}px`,
              }}
            >
              {previewText}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
