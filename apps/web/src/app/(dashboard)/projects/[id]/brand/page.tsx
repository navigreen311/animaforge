'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import ColorPicker from '@/components/brand/ColorPicker';
import TypographyEditor, { type TypographyConfig } from '@/components/brand/TypographyEditor';
import LogoManager, { type LogoConfig } from '@/components/brand/LogoManager';
import SonicBranding, { type SonicConfig } from '@/components/brand/SonicBranding';
import BrandPreview from '@/components/brand/BrandPreview';

type Tab = 'colors' | 'typography' | 'logo' | 'sonic' | 'templates';

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: 'colors', label: 'Colors', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { value: 'typography', label: 'Typography', icon: 'M4 6h16M4 12h8m-8 6h16' },
  { value: 'logo', label: 'Logo', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { value: 'sonic', label: 'Sonic Branding', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
  { value: 'templates', label: 'Templates', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
];

interface WatermarkConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
}

interface BrandTemplate {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_TEMPLATES: BrandTemplate[] = [
  { id: 't1', name: 'Corporate Clean', description: 'Minimal branding with subtle logo watermark' },
  { id: 't2', name: 'Bold Creator', description: 'Vibrant colors with prominent branding throughout' },
  { id: 't3', name: 'Cinematic', description: 'Dark theme with elegant typography and minimal overlay' },
];

export default function BrandKitPage() {
  const params = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<Tab>('colors');
  const [saving, setSaving] = useState(false);

  // Brand kit state
  const [colors, setColors] = useState({
    primary: '#6D28D9',
    secondary: '#1F2937',
    accent: '#F59E0B',
    background: '#111827',
    text: '#F9FAFB',
  });

  const [typography, setTypography] = useState<TypographyConfig>({
    headingFont: 'Inter',
    bodyFont: 'Inter',
    sizes: [
      { label: 'Display', value: 48 },
      { label: 'H1', value: 36 },
      { label: 'H2', value: 30 },
      { label: 'H3', value: 24 },
      { label: 'Body', value: 16 },
      { label: 'Caption', value: 12 },
    ],
  });

  const [logo, setLogo] = useState<LogoConfig>({
    url: '',
    placement: 'top-left',
    minSize: 64,
    opacity: 1,
  });

  const [sonic, setSonic] = useState<SonicConfig>({
    introUrl: '',
    outroUrl: '',
    transitionUrl: '',
  });

  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    position: 'bottom-right',
    opacity: 0.3,
  });

  const [templates] = useState<BrandTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/v1/projects/${params.id}/brand-kit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colors,
          logo,
          typography,
          sonic,
          watermark: { ...watermark },
          templates: templates.map((t) => ({ ...t, snapshot: {} })),
        }),
      });
    } catch {
      // Silently handle — would wire up toast notifications in production
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${params.id}/brand-kit/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputUrl: 'mock://preview-output' }),
      });
      const data = await res.json();
      alert(data.compliant ? 'Brand is compliant!' : `Violations: ${data.violations.map((v: { message: string }) => v.message).join(', ')}`);
    } catch {
      // Handle error
    }
  };

  const handleGenerateGuide = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${params.id}/brand-kit/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      alert(`Brand guide generated: ${data.guideUrl}`);
    } catch {
      // Handle error
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main editor panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Brand Kit</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Project {params.id} — Define your visual and sonic brand identity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleValidate}
              className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors"
            >
              Validate
            </button>
            <button
              type="button"
              onClick={handleGenerateGuide}
              className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors"
            >
              Generate Guide
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-1.5 text-xs font-medium text-white transition-colors"
            >
              {saving ? 'Saving...' : 'Save Brand Kit'}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-xl bg-gray-800/30 border border-gray-800 p-6">
          {activeTab === 'colors' && (
            <ColorPicker colors={colors} onChange={setColors} />
          )}

          {activeTab === 'typography' && (
            <TypographyEditor typography={typography} onChange={setTypography} />
          )}

          {activeTab === 'logo' && (
            <LogoManager logo={logo} onChange={setLogo} />
          )}

          {activeTab === 'sonic' && (
            <SonicBranding sonic={sonic} onChange={setSonic} />
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Select a brand template to quick-start your kit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTemplate(t.id)}
                    className={`rounded-xl p-4 text-left transition-colors border ${
                      activeTemplate === t.id
                        ? 'bg-violet-600/20 border-violet-500'
                        : 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="text-sm font-medium text-gray-200 mb-1">{t.name}</h4>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </button>
                ))}
              </div>

              {/* Watermark settings */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-200 mb-4">Watermark Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watermark.enabled}
                      onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-900 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-300">Enable watermark on output</span>
                  </label>

                  {watermark.enabled && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Position</label>
                        <select
                          value={watermark.position}
                          onChange={(e) => setWatermark({ ...watermark, position: e.target.value as WatermarkConfig['position'] })}
                          className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-400">Opacity</label>
                          <span className="text-xs text-gray-500 font-mono">{Math.round(watermark.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(watermark.opacity * 100)}
                          onChange={(e) => setWatermark({ ...watermark, opacity: Number(e.target.value) / 100 })}
                          className="w-full accent-violet-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side preview panel */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-6">
          <BrandPreview
            colors={colors}
            typography={typography}
            logo={logo}
            watermark={watermark}
          />
        </div>
      </div>
    </div>
  );
}
