'use client';

import { useState, useCallback } from 'react';

interface ColorEntry {
  label: string;
  key: string;
  value: string;
}

interface ColorPickerProps {
  colors: Record<string, string>;
  onChange: (colors: Record<string, string>) => void;
}

const PRESET_SWATCHES = [
  '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA',
  '#DC2626', '#EF4444', '#F97316', '#F59E0B',
  '#059669', '#10B981', '#06B6D4', '#3B82F6',
  '#1F2937', '#374151', '#6B7280', '#F9FAFB',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export default function ColorPicker({ colors, onChange }: ColorPickerProps) {
  const entries: ColorEntry[] = [
    { label: 'Primary', key: 'primary', value: colors.primary ?? '#6D28D9' },
    { label: 'Secondary', key: 'secondary', value: colors.secondary ?? '#1F2937' },
    { label: 'Accent', key: 'accent', value: colors.accent ?? '#F59E0B' },
    { label: 'Background', key: 'background', value: colors.background ?? '#111827' },
    { label: 'Text', key: 'text', value: colors.text ?? '#F9FAFB' },
  ];

  const [activeKey, setActiveKey] = useState<string>('primary');
  const [rgbInput, setRgbInput] = useState('');

  const activeEntry = entries.find((e) => e.key === activeKey)!;
  const activeRgb = hexToRgb(activeEntry.value);

  const updateColor = useCallback(
    (key: string, value: string) => {
      onChange({ ...colors, [key]: value });
    },
    [colors, onChange],
  );

  const handleHexInput = (hex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      updateColor(activeKey, hex);
    }
  };

  const handleRgbSubmit = () => {
    const match = rgbInput.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      if (r <= 255 && g <= 255 && b <= 255) {
        updateColor(activeKey, rgbToHex(r, g, b));
        setRgbInput('');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Color role buttons */}
      <div className="flex flex-wrap gap-3">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setActiveKey(entry.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeKey === entry.key
                ? 'bg-gray-700 text-white ring-1 ring-violet-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span
              className="inline-block h-4 w-4 rounded-full border border-gray-600"
              style={{ backgroundColor: entry.value }}
            />
            {entry.label}
          </button>
        ))}
      </div>

      {/* Active color editor */}
      <div className="rounded-xl bg-gray-800/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          {/* Large preview swatch */}
          <div
            className="h-20 w-20 rounded-xl border border-gray-600 shadow-inner"
            style={{ backgroundColor: activeEntry.value }}
          />
          <div className="flex-1 space-y-2">
            <label className="block text-xs text-gray-400">HEX</label>
            <input
              type="text"
              value={activeEntry.value}
              onChange={(e) => handleHexInput(e.target.value)}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <label className="block text-xs text-gray-400">RGB (r, g, b)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={activeRgb ? `${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b}` : ''}
                value={rgbInput}
                onChange={(e) => setRgbInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRgbSubmit()}
                className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleRgbSubmit}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-medium text-white transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Preset swatches */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => updateColor(activeKey, swatch)}
                className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 ${
                  activeEntry.value === swatch ? 'border-violet-400 ring-2 ring-violet-500' : 'border-gray-600'
                }`}
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Live preview band */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Live Preview</p>
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ backgroundColor: colors.background ?? '#111827' }}
        >
          <span style={{ color: colors.text ?? '#F9FAFB', fontWeight: 600 }}>Brand Title</span>
          <div className="flex gap-2">
            <span
              className="inline-block rounded-md px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: colors.primary ?? '#6D28D9' }}
            >
              Primary
            </span>
            <span
              className="inline-block rounded-md px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: colors.secondary ?? '#1F2937' }}
            >
              Secondary
            </span>
            <span
              className="inline-block rounded-md px-3 py-1 text-xs font-medium text-gray-900"
              style={{ backgroundColor: colors.accent ?? '#F59E0B' }}
            >
              Accent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
