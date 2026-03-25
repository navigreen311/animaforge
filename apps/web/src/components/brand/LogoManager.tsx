'use client';

import { useState, useRef } from 'react';

export interface LogoConfig {
  url: string;
  placement: 'top-left' | 'center' | 'bottom-right';
  minSize: number;
  opacity: number;
}

interface LogoManagerProps {
  logo: LogoConfig;
  onChange: (logo: LogoConfig) => void;
}

const PLACEMENTS: { value: LogoConfig['placement']; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export default function LogoManager({ logo, onChange }: LogoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    onChange({ ...logo, url });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
        }`}
      >
        {logo.url ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={logo.url}
              alt="Brand logo"
              className="max-h-24 max-w-48 object-contain"
            />
            <p className="text-xs text-gray-400">Click or drag to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">Drop logo image here or click to browse</p>
            <p className="text-xs text-gray-600">PNG, SVG, or WebP recommended</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Placement selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Placement</label>
        <div className="flex gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ ...logo, placement: p.value })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                logo.placement === p.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Minimum Size</label>
          <span className="text-xs text-gray-500 font-mono">{logo.minSize}px</span>
        </div>
        <input
          type="range"
          min={16}
          max={256}
          value={logo.minSize}
          onChange={(e) => onChange({ ...logo, minSize: Number(e.target.value) })}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Opacity slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Opacity</label>
          <span className="text-xs text-gray-500 font-mono">{Math.round(logo.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(logo.opacity * 100)}
          onChange={(e) => onChange({ ...logo, opacity: Number(e.target.value) / 100 })}
          className="w-full accent-violet-500"
        />
      </div>

      {/* Position preview */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Position Preview</p>
        <div className="relative rounded-xl bg-gray-900 border border-gray-700 aspect-video overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          {logo.url && (
            <div
              className={`absolute ${
                logo.placement === 'top-left' ? 'top-3 left-3' :
                logo.placement === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                'bottom-3 right-3'
              }`}
              style={{ opacity: logo.opacity }}
            >
              <img
                src={logo.url}
                alt="Logo preview"
                style={{ width: `${logo.minSize}px`, height: 'auto' }}
                className="object-contain"
              />
            </div>
          )}
          {!logo.url && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
              Upload a logo to preview placement
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
