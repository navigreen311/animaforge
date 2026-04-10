'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Palette,
  Type,
  Image,
  Plus,
  X,
  ChevronDown,
  Shield,
  Mic2,
  Play,
  Pause,
  Upload,
  Trash2,
  RefreshCw,
  FileDown,
  MessageSquare,
  LayoutTemplate,
  Pipette,
  Check,
  Monitor,
  Volume2,
  Music,
  Layout,
  CreditCard,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { WaveformVisualizer } from '@/components/ui/WaveformVisualizer';

// ── Types ────────────────────────────────────────────────────────
interface BrandColor {
  id: string;
  role: string;
  hex: string;
  label: string;
}

interface FontSlot {
  role: string;
  family: string;
  hint: string;
}

interface FontSize {
  label: string;
  size: number;
}

interface AudioTrack {
  name: string;
  duration: string;
  file: File | null;
}

type Strictness = 'warn' | 'block' | 'log';
type Tone = 'formal' | 'professional' | 'casual' | 'playful';
type VoiceStyle = 'technical' | 'storytelling' | 'direct';
type LowerThirdPosition = 'bottom-left' | 'bottom-center' | 'bottom-right';
type Animation = 'slide' | 'fade' | 'wipe';
type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
type WatermarkSize = 'small' | 'medium' | 'large';

// ── Initial Data ─────────────────────────────────────────────────
const INITIAL_COLORS: BrandColor[] = [
  { id: '1', role: 'PRIMARY', hex: '#7c3aed', label: 'Purple' },
  { id: '2', role: 'SECONDARY', hex: '#06b6d4', label: 'Cyan' },
  { id: '3', role: 'ACCENT', hex: '#f59e0b', label: 'Amber' },
  { id: '4', role: 'BACKGROUND', hex: '#0a0a0f', label: 'Near Black' },
  { id: '5', role: 'TEXT', hex: '#e2e8f0', label: 'Light Gray' },
  { id: '6', role: 'NEUTRAL', hex: '#888780', label: 'Mid Gray' },
];

const INITIAL_FONTS: FontSlot[] = [
  { role: 'Primary', family: 'DM Sans', hint: 'Body copy & UI' },
  { role: 'Secondary', family: 'Inter', hint: 'Captions & labels' },
  { role: 'Display', family: 'Space Grotesk', hint: 'Headlines & titles' },
];

const POPULAR_GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'DM Sans',
  'Space Grotesk',
  'Open Sans',
  'Lato',
  'Montserrat',
];

const INITIAL_FONT_SIZES: FontSize[] = [
  { label: 'H1', size: 32 },
  { label: 'H2', size: 24 },
  { label: 'H3', size: 18 },
  { label: 'Body', size: 14 },
  { label: 'Small', size: 12 },
  { label: 'Micro', size: 10 },
];

interface BrandKitSummary {
  id: string;
  name: string;
}

const INITIAL_BRAND_KITS: BrandKitSummary[] = [
  { id: 'kit-1', name: 'AnimaForge Studio' },
  { id: 'kit-2', name: 'Client - Acme Corp' },
  { id: 'kit-3', name: 'Personal Brand' },
];

const ENFORCEMENT_RULES = [
  { key: 'blockOffBrand', label: 'Block off-brand colors' },
  { key: 'applyWatermark', label: 'Apply watermark' },
  { key: 'applyLowerThird', label: 'Apply lower third' },
  { key: 'applyEndCard', label: 'Apply end card' },
  { key: 'useBrandFonts', label: 'Use brand fonts' },
  { key: 'prependBrandSound', label: 'Prepend brand sound' },
] as const;

// ── Reusable Styles ──────────────────────────────────────────────
const sectionBox: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const subLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

const tinyLabel: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-tertiary)',
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-hover)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--brand-dim)',
  border: '0.5px solid var(--brand-border)',
  borderRadius: 'var(--radius-pill)',
  padding: '3px 10px',
  fontSize: 11,
  color: 'var(--text-brand)',
  cursor: 'default',
};

const chipDeleteBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--text-brand)',
  display: 'flex',
  alignItems: 'center',
};

const smallBtn: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: 'none',
  padding: '4px 10px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const ghostBtn: React.CSSProperties = {
  background: 'var(--bg-hover)',
  color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const toggleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 0',
};

const dropZone: React.CSSProperties = {
  border: '1.5px dashed var(--border)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  transition: 'border-color 150ms ease',
  minHeight: 100,
};

// ── Toggle Component ─────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? 'var(--brand)' : 'var(--bg-hover)',
        border: `0.5px solid ${checked ? 'var(--brand-border)' : 'var(--border)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 3,
          transition: 'left 150ms ease',
        }}
      />
    </button>
  );
}

// ── Radio Group Component ────────────────────────────────────────
function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            background: value === opt.value ? 'var(--brand)' : 'var(--bg-hover)',
            color: value === opt.value ? '#ffffff' : 'var(--text-secondary)',
            border: '0.5px solid var(--border)',
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: value === opt.value ? 500 : 400,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            borderRadius:
              i === 0
                ? 'var(--radius-md) 0 0 var(--radius-md)'
                : i === options.length - 1
                  ? '0 var(--radius-md) var(--radius-md) 0'
                  : '0',
            marginLeft: i === 0 ? 0 : -0.5,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Color conversion helpers ─────────────────────────────────────
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { h: 0, s: 0, l: 0 };
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Color Editor Popover ─────────────────────────────────────────
function ColorEditor({
  color,
  onSave,
  onCancel,
}: {
  color: BrandColor;
  onSave: (c: BrandColor) => void;
  onCancel: () => void;
}) {
  const initialHsl = hexToHsl(color.hex);
  const [hex, setHex] = useState(color.hex);
  const [hue, setHue] = useState(initialHsl.h);
  const [sat, setSat] = useState(initialHsl.s);
  const [lig, setLig] = useState(initialHsl.l);
  const [label, setLabel] = useState(color.label);
  const [roleLabel, setRoleLabel] = useState(color.role);

  const updateHex = (newHex: string) => {
    setHex(newHex);
    if (/^#[0-9a-fA-F]{6}$/.test(newHex)) {
      const hsl = hexToHsl(newHex);
      setHue(hsl.h);
      setSat(hsl.s);
      setLig(hsl.l);
    }
  };

  const updateHsl = (h: number, s: number, l: number) => {
    setHue(h);
    setSat(s);
    setLig(l);
    setHex(hslToHex(h, s, l));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          ...sectionBox,
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={sectionTitle}>Edit Color</span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{color.role}</span>
        </div>

        {/* Large preview swatch */}
        <div
          style={{
            width: '100%',
            height: 72,
            borderRadius: 'var(--radius-md)',
            background: hex,
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.9)',
              background: 'rgba(0,0,0,0.35)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {hex.toUpperCase()}
          </span>
        </div>

        {/* Hex input */}
        <div>
          <label style={tinyLabel} htmlFor="color-hex">Hex</label>
          <input
            id="color-hex"
            type="text"
            value={hex}
            onChange={(e) => updateHex(e.target.value)}
            placeholder="#______"
            maxLength={7}
            style={{ ...inputStyle, fontFamily: 'monospace' }}
          />
        </div>

        {/* Role label input */}
        <div>
          <label style={tinyLabel} htmlFor="color-role">Role</label>
          <input
            id="color-role"
            type="text"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Label input */}
        <div>
          <label style={tinyLabel} htmlFor="color-label">Label</label>
          <input id="color-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
        </div>

        {/* HSL sliders (bidirectional) */}
        <div>
          <label style={tinyLabel}>Hue: {hue}</label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => updateHsl(Number(e.target.value), sat, lig)}
            aria-label="Hue"
            aria-valuenow={hue}
            aria-valuemin={0}
            aria-valuemax={360}
            style={{ width: '100%', accentColor: hex, cursor: 'pointer' }}
          />
        </div>
        <div>
          <label style={tinyLabel}>Saturation: {sat}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={sat}
            onChange={(e) => updateHsl(hue, Number(e.target.value), lig)}
            aria-label="Saturation"
            aria-valuenow={sat}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: '100%', accentColor: hex, cursor: 'pointer' }}
          />
        </div>
        <div>
          <label style={tinyLabel}>Lightness: {lig}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={lig}
            onChange={(e) => updateHsl(hue, sat, Number(e.target.value))}
            aria-label="Lightness"
            aria-valuenow={lig}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: '100%', accentColor: hex, cursor: 'pointer' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={ghostBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ ...color, hex, label, role: roleLabel });
              toast.success(`Updated ${roleLabel} color`);
            }}
            style={smallBtn}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Font Picker Modal ────────────────────────────────────────────
function FontPickerModal({
  currentFont,
  slotRole,
  onSelect,
  onCancel,
}: {
  currentFont: string;
  slotRole: string;
  onSelect: (family: string) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<'google' | 'custom'>('google');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentFont);
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');
  const [dragOver, setDragOver] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  const filtered = POPULAR_GOOGLE_FONTS.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCustomUpload = (file: File) => {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) {
      toast.error('Only TTF, OTF, or WOFF files are allowed');
      return;
    }
    const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, '');
    setSelected(family);
    toast.success(`Loaded custom font: ${family}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          ...sectionBox,
          width: 520,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={sectionTitle}>Choose a font</span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{slotRole}</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
          {(['google', 'custom'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -0.5,
              }}
            >
              {t === 'google' ? 'Google Fonts' : 'Custom Upload'}
            </button>
          ))}
        </div>

        {tab === 'google' ? (
          <>
            {/* Search */}
            <input
              type="search"
              aria-label="Search fonts"
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />

            {/* Font list */}
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 6,
              }}
            >
              {filtered.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: 8 }}>
                  No fonts match "{search}"
                </span>
              )}
              {filtered.map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => setSelected(family)}
                  style={{
                    background: selected === family ? 'var(--brand-dim)' : 'transparent',
                    border:
                      selected === family
                        ? '0.5px solid var(--brand-border)'
                        : '0.5px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{family}</span>
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: `"${family}", sans-serif`,
                    }}
                  >
                    {previewText || 'The quick brown fox jumps over the lazy dog'}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Custom upload */}
            <input
              ref={customInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              aria-label="Upload custom font file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCustomUpload(f);
              }}
            />
            <div
              style={{
                ...dropZone,
                borderColor: dragOver ? 'var(--brand)' : 'var(--border)',
                minHeight: 140,
              }}
              onClick={() => customInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleCustomUpload(f);
              }}
            >
              <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Drop TTF, OTF, or WOFF file here
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                or click to browse
              </span>
            </div>
          </>
        )}

        {/* Live preview */}
        <div>
          <label style={tinyLabel} htmlFor="font-preview-text">Live preview</label>
          <input
            id="font-preview-text"
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            style={inputStyle}
          />
          <div
            style={{
              marginTop: 8,
              padding: 14,
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-md)',
              border: '0.5px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
              {selected}
            </span>
            <span
              style={{
                fontSize: 20,
                color: 'var(--text-primary)',
                fontFamily: `"${selected}", sans-serif`,
              }}
            >
              {previewText || 'The quick brown fox jumps over the lazy dog'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={ghostBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(selected);
              toast.success(`${slotRole} font set to ${selected}`);
            }}
            style={smallBtn}
          >
            <Check size={11} /> Select this font
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────
export default function BrandKitPage() {
  // Kit switcher
  const [brandKits, setBrandKits] = useState<BrandKitSummary[]>(INITIAL_BRAND_KITS);
  const [activeKitId, setActiveKitId] = useState<string>(INITIAL_BRAND_KITS[0].id);
  const [kitDropdownOpen, setKitDropdownOpen] = useState(false);
  const [createKitModalOpen, setCreateKitModalOpen] = useState(false);
  const [newKitName, setNewKitName] = useState('');
  const brandKit = brandKits.find((k) => k.id === activeKitId) ?? brandKits[0];

  // Brand enforcement
  const [enforcementProjects, setEnforcementProjects] = useState(['Hero Promo', 'Brand Story']);
  const [enforcementRules, setEnforcementRules] = useState<Record<string, boolean>>({
    blockOffBrand: true,
    applyWatermark: true,
    applyLowerThird: false,
    applyEndCard: true,
    useBrandFonts: true,
    prependBrandSound: false,
  });
  const [strictness, setStrictness] = useState<Strictness>('warn');

  // Colors
  const [colors, setColors] = useState<BrandColor[]>(INITIAL_COLORS);
  const [editingColor, setEditingColor] = useState<BrandColor | null>(null);
  const [extractedSwatches, setExtractedSwatches] = useState<string[] | null>(null);

  // Brand voice
  const [tone, setTone] = useState<Tone>('professional');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('direct');
  const [brandKeywords, setBrandKeywords] = useState(['innovation', 'quality']);
  const [avoidWords, setAvoidWords] = useState(['cheap', 'basic']);
  const [tagline, setTagline] = useState('');
  const [mission, setMission] = useState('');

  // Brand voice auto-save
  const [voiceSaveStatus, setVoiceSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const voiceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceFirstRunRef = useRef(true);

  useEffect(() => {
    if (voiceFirstRunRef.current) {
      voiceFirstRunRef.current = false;
      return;
    }
    if (voiceSaveTimerRef.current) clearTimeout(voiceSaveTimerRef.current);
    if (voiceResetTimerRef.current) clearTimeout(voiceResetTimerRef.current);
    voiceSaveTimerRef.current = setTimeout(async () => {
      setVoiceSaveStatus('saving');
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setVoiceSaveStatus('saved');
      voiceResetTimerRef.current = setTimeout(() => setVoiceSaveStatus('idle'), 2000);
    }, 800);
    return () => {
      if (voiceSaveTimerRef.current) clearTimeout(voiceSaveTimerRef.current);
    };
  }, [tagline, mission, tone, voiceStyle]);

  // Typography
  const [fonts, setFonts] = useState<FontSlot[]>(INITIAL_FONTS);
  const [fontSizes, setFontSizes] = useState<FontSize[]>(INITIAL_FONT_SIZES);
  const [editingSizeIdx, setEditingSizeIdx] = useState<number | null>(null);
  const [editingSizeVal, setEditingSizeVal] = useState('');
  const [editingFontIdx, setEditingFontIdx] = useState<number | null>(null);

  // Sonic branding
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [sonicToggles, setSonicToggles] = useState({
    prepend: true,
    watermark: false,
    append: false,
  });
  const [sonicVolume, setSonicVolume] = useState(-12); // dB, -40..0
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Lower third
  const [lowerThirdName, setLowerThirdName] = useState('Jane Doe');
  const [lowerThirdTitle, setLowerThirdTitle] = useState('Creative Director');
  const [lowerThirdBarColor, setLowerThirdBarColor] = useState('#7c3aed');
  const [lowerThirdFont, setLowerThirdFont] = useState('DM Sans');
  const [lowerThirdPosition, setLowerThirdPosition] = useState<LowerThirdPosition>('bottom-left');
  const [lowerThirdAnimation, setLowerThirdAnimation] = useState<Animation>('slide');
  const [lowerThirdDuration, setLowerThirdDuration] = useState(3);

  // End card
  const [endCardLogoPos, setEndCardLogoPos] = useState('center');
  const [endCardCTA, setEndCardCTA] = useState('Subscribe for more');
  const [endCardYouTube, setEndCardYouTube] = useState('');
  const [endCardInstagram, setEndCardInstagram] = useState('');
  const [endCardTikTok, setEndCardTikTok] = useState('');
  const [endCardX, setEndCardX] = useState('');
  const [endCardBg, setEndCardBg] = useState('#0a0a0f');
  const [endCardDuration, setEndCardDuration] = useState(5);

  // Logo & watermark
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(30);
  const [watermarkSize, setWatermarkSize] = useState<WatermarkSize>('small');
  const [safeZoneMargins, setSafeZoneMargins] = useState({ top: 5, bottom: 10, left: 5, right: 5 });
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ────────────────────────────────────────────────────
  const addChip = useCallback(
    (list: string[], setList: (v: string[]) => void) => {
      const value = prompt('Enter value:');
      if (value && value.trim()) {
        setList([...list, value.trim()]);
      }
    },
    [],
  );

  const removeChip = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    if (!file.type.match(/audio\/(mpeg|wav)/)) {
      toast.error('Only MP3 and WAV files are allowed');
      return;
    }
    setAudioTrack({ name: file.name, duration: '0:00', file });
    toast.success(`Uploaded ${file.name}`);
  };

  const handleExtractColors = () => {
    setExtractedSwatches(['#7c3aed', '#1e1b4b', '#c4b5fd', '#f5f3ff', '#4c1d95']);
    toast.info('Extracted 5 colors from logo');
  };

  const handleAcceptExtracted = () => {
    if (!extractedSwatches) return;
    const newColors = extractedSwatches.map((hex, i) => ({
      id: `ext-${i}`,
      role: `EXTRACTED-${i + 1}`,
      hex,
      label: `Extracted ${i + 1}`,
    }));
    setColors((prev) => [...prev, ...newColors]);
    setExtractedSwatches(null);
    toast.success('Extracted colors added to palette');
  };

  const handleExportStyleGuide = () => {
    const loadingId = toast.loading('Generating style guide PDF...');
    setTimeout(() => {
      toast.dismiss(loadingId);
      toast.success('Style guide ready');
      // Mock download
      const a = document.createElement('a');
      a.href = 'data:application/pdf;base64,';
      a.download = `${brandKit.name}-style-guide.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 2000);
  };

  const handleCreateKit = () => {
    const name = newKitName.trim();
    if (!name) {
      toast.error('Please enter a kit name');
      return;
    }
    const newKit: BrandKitSummary = { id: `kit-${Date.now()}`, name };
    setBrandKits((prev) => [...prev, newKit]);
    setActiveKitId(newKit.id);
    setCreateKitModalOpen(false);
    setNewKitName('');
    toast.success(`Created ${name}`);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Create brand kit modal */}
      {createKitModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setCreateKitModalOpen(false)}
        >
          <div
            style={{ ...sectionBox, width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={sectionTitle}>Create brand kit</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCreateKitModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
            <div>
              <label style={tinyLabel} htmlFor="new-kit-name">Name</label>
              <input
                id="new-kit-name"
                type="text"
                value={newKitName}
                onChange={(e) => setNewKitName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateKit();
                }}
                placeholder="My brand kit"
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setCreateKitModalOpen(false)} style={ghostBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleCreateKit} style={smallBtn}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color editor modal */}
      {editingColor && (
        <ColorEditor
          color={editingColor}
          onSave={(updated) => {
            setColors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditingColor(null);
          }}
          onCancel={() => setEditingColor(null)}
        />
      )}

      {/* Font picker modal */}
      {editingFontIdx !== null && fonts[editingFontIdx] && (
        <FontPickerModal
          currentFont={fonts[editingFontIdx].family}
          slotRole={fonts[editingFontIdx].role}
          onSelect={(family) => {
            setFonts((prev) => prev.map((f, i) => (i === editingFontIdx ? { ...f, family } : f)));
            setEditingFontIdx(null);
          }}
          onCancel={() => setEditingFontIdx(null)}
        />
      )}

      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ══════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Brand Kit
            </h1>

            {/* Kit Switcher */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setKitDropdownOpen(!kitDropdownOpen)}
                style={{
                  ...ghostBtn,
                  padding: '5px 12px',
                  gap: 6,
                }}
              >
                {brandKit.name}
                <ChevronDown size={12} />
              </button>
              {kitDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 4,
                    minWidth: 220,
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {brandKits.map((kit) => {
                    const isActive = kit.id === activeKitId;
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        onClick={() => {
                          if (!isActive) {
                            setActiveKitId(kit.id);
                            toast.success(`Switched to ${kit.name}`);
                          }
                          setKitDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          width: '100%',
                          textAlign: 'left',
                          background: isActive ? 'var(--brand-dim)' : 'transparent',
                          color: isActive ? 'var(--text-brand)' : 'var(--text-primary)',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{kit.name}</span>
                        {isActive && <Check size={12} />}
                      </button>
                    );
                  })}
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setKitDropdownOpen(false);
                      setNewKitName('');
                      setCreateKitModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} /> Create new brand kit
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportStyleGuide}
            style={{ ...smallBtn, padding: '6px 14px', fontSize: 12 }}
          >
            <FileDown size={13} />
            Export Style Guide
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════
            1. BRAND ENFORCEMENT
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Brand Enforcement</span>
          </div>

          {/* Project chips */}
          <div style={{ marginBottom: 14 }}>
            <span style={subLabel}>Assigned Projects</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {enforcementProjects.map((p, i) => (
                <span key={p} style={chipStyle}>
                  {p}
                  <button
                    type="button"
                    aria-label={`Remove ${p}`}
                    style={chipDeleteBtn}
                    onClick={() => removeChip(enforcementProjects, setEnforcementProjects, i)}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                style={{ ...chipStyle, background: 'var(--bg-hover)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => addChip(enforcementProjects, setEnforcementProjects)}
              >
                <Plus size={10} /> Add Project
              </button>
            </div>
          </div>

          {/* Enforcement rules */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 24px',
              marginBottom: 14,
            }}
          >
            {ENFORCEMENT_RULES.map((rule) => (
              <div key={rule.key} style={toggleRow}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{rule.label}</span>
                <Toggle
                  checked={enforcementRules[rule.key]}
                  onChange={(v) => setEnforcementRules((prev) => ({ ...prev, [rule.key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Strictness */}
          <div>
            <span style={subLabel}>Strictness</span>
            <RadioGroup
              options={[
                { value: 'warn', label: 'Warn' },
                { value: 'block', label: 'Block' },
                { value: 'log', label: 'Log only' },
              ]}
              value={strictness}
              onChange={(v) => setStrictness(v as Strictness)}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            2. COLORS
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={sectionTitle}>Colors</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleExtractColors}
                style={ghostBtn}
              >
                <Pipette size={11} />
                Extract from logo
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = `c-${Date.now()}`;
                  setColors((prev) => [...prev, { id, role: 'CUSTOM', hex: '#ffffff', label: 'New Color' }]);
                  toast.info('New color added');
                }}
                style={smallBtn}
              >
                <Plus size={11} />
                Add Color
              </button>
            </div>
          </div>

          {/* Color swatches with roles */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {colors.map((color) => (
              <div
                key={color.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
                onClick={() => setEditingColor(color)}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: color.hex,
                    border:
                      color.hex.toLowerCase() === '#0a0a0f'
                        ? '1px solid var(--border-strong)'
                        : '1px solid transparent',
                    transition: 'transform 150ms ease',
                  }}
                  title={`${color.role}: ${color.hex}`}
                />
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {color.role}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                  {color.hex}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{color.label}</span>
              </div>
            ))}
          </div>

          {/* Extracted swatches */}
          {extractedSwatches && (
            <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ ...subLabel, marginBottom: 8 }}>Extracted from logo</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {extractedSwatches.map((hex, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: hex,
                      border: '1px solid var(--border)',
                    }}
                    title={hex}
                  />
                ))}
                <button type="button" style={smallBtn} onClick={handleAcceptExtracted}>
                  <Check size={11} /> Accept
                </button>
                <button type="button" style={ghostBtn} onClick={() => setExtractedSwatches(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            3. SONIC BRANDING (BK-1) — between Colors and Brand Voice
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Volume2 size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Sonic Branding</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Audio upload / player */}
            <div>
              <span style={subLabel}>Brand Sound</span>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={{ display: 'none' }}
                onChange={handleAudioUpload}
              />
              {!audioTrack ? (
                <div
                  style={{ ...dropZone, minHeight: 120, padding: 16 }}
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Music size={22} style={{ color: 'var(--text-tertiary)' }} />
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    Drop brand sound here — MP3/WAV, max 5 MB
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      textAlign: 'center',
                    }}
                  >
                    Logo sting, jingle, or notification tone
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      aria-label={audioPlaying ? 'Pause brand sound' : 'Play brand sound'}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--brand)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={() => setAudioPlaying(!audioPlaying)}
                    >
                      {audioPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {audioTrack.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {audioTrack.duration}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={ghostBtn}
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <RefreshCw size={10} /> Replace
                    </button>
                  </div>
                  <div style={{ paddingLeft: 2, paddingRight: 2 }}>
                    <WaveformVisualizer
                      trackId={audioTrack.name}
                      isPlaying={audioPlaying}
                      progress={audioPlaying ? 0.35 : 0}
                      color="#7c3aed"
                      height={28}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Usage toggles & volume */}
            <div>
              <span style={subLabel}>Usage</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    Prepend to all video exports
                  </span>
                  <Toggle
                    checked={sonicToggles.prepend}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, prepend: v }))}
                  />
                </div>
                <div style={toggleRow}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                      Apply as audio watermark on exports
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      Faint, at -20 dB
                    </span>
                  </div>
                  <Toggle
                    checked={sonicToggles.watermark}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, watermark: v }))}
                  />
                </div>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    Append to all video exports
                  </span>
                  <Toggle
                    checked={sonicToggles.append}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, append: v }))}
                  />
                </div>
              </div>
              {(sonicToggles.prepend || sonicToggles.watermark) && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <label style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      Volume
                    </label>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {sonicVolume} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={0}
                    step={1}
                    value={sonicVolume}
                    onChange={(e) => setSonicVolume(Number(e.target.value))}
                    aria-label="Sonic logo volume (dB)"
                    aria-valuenow={sonicVolume}
                    aria-valuemin={-40}
                    aria-valuemax={0}
                    style={{
                      width: '100%',
                      accentColor: 'var(--brand)',
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'monospace',
                      marginTop: 2,
                    }}
                  >
                    <span>-40 dB</span>
                    <span>0 dB</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            4. BRAND VOICE
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Brand Voice</span>
            {voiceSaveStatus === 'saving' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginLeft: 4,
                }}
              >
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                Saving...
              </span>
            )}
            {voiceSaveStatus === 'saved' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#4ade80',
                  marginLeft: 4,
                }}
              >
                <Check size={11} />
                Saved
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Tone */}
            <div>
              <span style={subLabel}>Tone</span>
              <RadioGroup
                options={[
                  { value: 'formal', label: 'Formal' },
                  { value: 'professional', label: 'Professional' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'playful', label: 'Playful' },
                ]}
                value={tone}
                onChange={(v) => setTone(v as Tone)}
              />
            </div>

            {/* Style */}
            <div>
              <span style={subLabel}>Style</span>
              <RadioGroup
                options={[
                  { value: 'technical', label: 'Technical' },
                  { value: 'storytelling', label: 'Storytelling' },
                  { value: 'direct', label: 'Direct' },
                ]}
                value={voiceStyle}
                onChange={(v) => setVoiceStyle(v as VoiceStyle)}
              />
            </div>

            {/* Brand keywords */}
            <div>
              <span style={subLabel}>Brand Keywords</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {brandKeywords.map((kw, i) => (
                  <span key={kw} style={chipStyle}>
                    {kw}
                    <button type="button" aria-label={`Remove ${kw}`} style={chipDeleteBtn} onClick={() => removeChip(brandKeywords, setBrandKeywords, i)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  style={{ ...chipStyle, background: 'var(--bg-hover)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => addChip(brandKeywords, setBrandKeywords)}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>

            {/* Avoid words */}
            <div>
              <span style={subLabel}>Avoid Words</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {avoidWords.map((w, i) => (
                  <span key={w} style={{ ...chipStyle, background: 'rgba(239,68,68,0.12)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    {w}
                    <button type="button" aria-label={`Remove ${w}`} style={{ ...chipDeleteBtn, color: '#fca5a5' }} onClick={() => removeChip(avoidWords, setAvoidWords, i)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  style={{ ...chipStyle, background: 'var(--bg-hover)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => addChip(avoidWords, setAvoidWords)}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label style={subLabel} htmlFor="brand-tagline">Tagline</label>
              <input
                id="brand-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your brand tagline..."
                style={inputStyle}
              />
            </div>

            {/* Mission */}
            <div>
              <label style={subLabel} htmlFor="brand-mission">Mission</label>
              <input
                id="brand-mission"
                type="text"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="Your brand mission..."
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            4. TYPOGRAPHY
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Type size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Typography</span>
          </div>

          {/* Font slots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {fonts.map((f, i) => (
              <div
                key={f.role}
                style={{
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                      }}
                    >
                      {f.role}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      {f.hint}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{ ...ghostBtn, padding: '2px 8px', fontSize: 10 }}
                    onClick={() => setEditingFontIdx(i)}
                  >
                    Change
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingFontIdx(i)}
                  title={`Change ${f.role} font`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      fontFamily: `"${f.family}", sans-serif`,
                      display: 'block',
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--border)',
                      textUnderlineOffset: 3,
                    }}
                  >
                    {f.family}
                  </span>
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: `"${f.family}", sans-serif`,
                    display: 'block',
                    marginTop: 4,
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </span>
              </div>
            ))}
          </div>

          {/* Size scale */}
          <div>
            <span style={subLabel}>Size Scale</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {fontSizes.map((fs, i) => (
                <div
                  key={fs.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 10px',
                    minWidth: 52,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setEditingSizeIdx(i);
                    setEditingSizeVal(String(fs.size));
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fs.label}
                  </span>
                  {editingSizeIdx === i ? (
                    <input
                      type="number"
                      aria-label="Font size in pixels"
                      autoFocus
                      value={editingSizeVal}
                      onChange={(e) => setEditingSizeVal(e.target.value)}
                      onBlur={() => {
                        const num = parseInt(editingSizeVal);
                        if (!isNaN(num) && num > 0) {
                          setFontSizes((prev) => prev.map((s, j) => (j === i ? { ...s, size: num } : s)));
                        }
                        setEditingSizeIdx(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      style={{
                        width: 36,
                        fontSize: 9,
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        background: 'var(--bg-base)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--brand)',
                        borderRadius: 4,
                        padding: '1px 2px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      {fs.size}px
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            5. SONIC BRANDING
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Volume2 size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Sonic Branding</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Audio upload zone */}
            <div>
              <span style={subLabel}>Brand Sound</span>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={{ display: 'none' }}
                onChange={handleAudioUpload}
              />
              {!audioTrack ? (
                <div
                  style={{ ...dropZone, minHeight: 120, padding: 16 }}
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Music size={22} style={{ color: 'var(--text-tertiary)' }} />
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    Drop brand sound here — MP3/WAV, max 5 MB
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      textAlign: 'center',
                    }}
                  >
                    Logo sting, jingle, or notification tone
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      aria-label={audioPlaying ? 'Pause brand sound' : 'Play brand sound'}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--brand)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={() => setAudioPlaying(!audioPlaying)}
                    >
                      {audioPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {audioTrack.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {audioTrack.duration}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={ghostBtn}
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <RefreshCw size={10} /> Replace
                    </button>
                  </div>
                  <div style={{ paddingLeft: 2, paddingRight: 2 }}>
                    <WaveformVisualizer
                      trackId={audioTrack.name}
                      isPlaying={audioPlaying}
                      progress={audioPlaying ? 0.35 : 0}
                      color="#7c3aed"
                      height={28}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Usage toggles & volume */}
            <div>
              <span style={subLabel}>Usage</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    Prepend to all video exports
                  </span>
                  <Toggle
                    checked={sonicToggles.prepend}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, prepend: v }))}
                  />
                </div>
                <div style={toggleRow}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                      Apply as audio watermark on exports
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      Faint, at -20 dB
                    </span>
                  </div>
                  <Toggle
                    checked={sonicToggles.watermark}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, watermark: v }))}
                  />
                </div>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    Append to all video exports
                  </span>
                  <Toggle
                    checked={sonicToggles.append}
                    onChange={(v) => setSonicToggles((p) => ({ ...p, append: v }))}
                  />
                </div>
              </div>
              {(sonicToggles.prepend || sonicToggles.watermark) && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <label style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      Volume
                    </label>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {sonicVolume} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={0}
                    step={1}
                    value={sonicVolume}
                    onChange={(e) => setSonicVolume(Number(e.target.value))}
                    aria-label="Sonic logo volume (dB)"
                    aria-valuenow={sonicVolume}
                    aria-valuemin={-40}
                    aria-valuemax={0}
                    style={{
                      width: '100%',
                      accentColor: 'var(--brand)',
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'monospace',
                      marginTop: 2,
                    }}
                  >
                    <span>-40 dB</span>
                    <span>0 dB</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            6. LOWER THIRD (BK-2)
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layout size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={sectionTitle}>Lower Third</span>
            </div>
            <button
              type="button"
              style={smallBtn}
              onClick={() => toast.success('Lower third template saved')}
            >
              <Save size={11} /> Save Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
            {/* Live preview (16:9 at 400x225) */}
            <div>
              <span style={subLabel}>Preview</span>
              <div
                style={{
                  width: 400,
                  height: 225,
                  background: '#111',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                }}
              >
                {/* Lower third bar */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: lowerThirdPosition === 'bottom-center' ? 20 : 16,
                    left:
                      lowerThirdPosition === 'bottom-left'
                        ? 16
                        : lowerThirdPosition === 'bottom-center'
                          ? '50%'
                          : 'auto',
                    right: lowerThirdPosition === 'bottom-right' ? 16 : 'auto',
                    transform: lowerThirdPosition === 'bottom-center' ? 'translateX(-50%)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                  }}
                >
                  <div
                    style={{
                      background: colors.find((c) => c.role === 'PRIMARY')?.hex || lowerThirdBarColor,
                      padding: '6px 14px 3px',
                      borderRadius: '4px 4px 0 0',
                      fontFamily: `"${fonts[0]?.family || lowerThirdFont}", sans-serif`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                      {lowerThirdName || 'Name'}
                    </div>
                  </div>
                  <div
                    style={{
                      background: colors.find((c) => c.role === 'SECONDARY')?.hex || 'rgba(0,0,0,0.7)',
                      padding: '3px 14px 5px',
                      borderRadius: '0 0 4px 4px',
                      fontFamily: `"${fonts[1]?.family || lowerThirdFont}", sans-serif`,
                    }}
                  >
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>
                      {lowerThirdTitle || 'Title'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={tinyLabel} htmlFor="lower-third-name">Name placeholder</label>
                <input
                  id="lower-third-name"
                  type="text"
                  value={lowerThirdName}
                  onChange={(e) => setLowerThirdName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={tinyLabel} htmlFor="lower-third-title">Title placeholder</label>
                <input
                  id="lower-third-title"
                  type="text"
                  value={lowerThirdTitle}
                  onChange={(e) => setLowerThirdTitle(e.target.value)}
                  placeholder="e.g. Creative Director"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={tinyLabel}>Position</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(
                    [
                      { value: 'bottom-left', label: 'Bottom-left' },
                      { value: 'bottom-center', label: 'Bottom-center' },
                      { value: 'bottom-right', label: 'Bottom-right' },
                    ] as { value: LowerThirdPosition; label: string }[]
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="lowerThirdPosition"
                        value={opt.value}
                        checked={lowerThirdPosition === opt.value}
                        onChange={() => setLowerThirdPosition(opt.value)}
                        style={{ accentColor: 'var(--brand)', cursor: 'pointer' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel}>Animation</label>
                  <select
                    value={lowerThirdAnimation}
                    onChange={(e) => setLowerThirdAnimation(e.target.value as Animation)}
                    style={selectStyle}
                  >
                    <option value="slide">Slide-in</option>
                    <option value="fade">Fade</option>
                    <option value="wipe">Wipe</option>
                  </select>
                </div>
                <div>
                  <label style={tinyLabel}>Duration</label>
                  <select
                    value={lowerThirdDuration}
                    onChange={(e) => setLowerThirdDuration(Number(e.target.value))}
                    style={selectStyle}
                  >
                    <option value={2}>2s</option>
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            7. END CARD (BK-3)
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={sectionTitle}>End Card</span>
            </div>
            <button
              type="button"
              style={smallBtn}
              onClick={() => toast.success('End card template saved')}
            >
              <Save size={11} /> Save Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
            {/* Live preview (16:9) */}
            <div>
              <span style={subLabel}>Preview</span>
              <div
                style={{
                  width: 400,
                  height: 225,
                  background:
                    colors.find((c) => c.role === 'BACKGROUND')?.hex || endCardBg,
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  fontFamily: `"${fonts[0]?.family || 'DM Sans'}", sans-serif`,
                }}
              >
                {/* Logo placeholder - centered */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      colors.find((c) => c.role === 'PRIMARY')?.hex || 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>A</span>
                </div>

                {/* CTA */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.find((c) => c.role === 'TEXT')?.hex || '#fff',
                    textAlign: 'center',
                    padding: '0 24px',
                  }}
                >
                  {endCardCTA || 'Your CTA here'}
                </div>

                {/* Socials */}
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.65)',
                    fontFamily: `"${fonts[1]?.family || 'Inter'}", sans-serif`,
                  }}
                >
                  {endCardYouTube && <span>▶ {endCardYouTube}</span>}
                  {endCardInstagram && <span>◉ {endCardInstagram}</span>}
                  {endCardTikTok && <span>♪ {endCardTikTok}</span>}
                  {endCardX && <span>𝕏 {endCardX}</span>}
                  {!endCardYouTube &&
                    !endCardInstagram &&
                    !endCardTikTok &&
                    !endCardX && <span>Add social handles</span>}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={tinyLabel} htmlFor="end-card-cta">CTA text</label>
                <input
                  id="end-card-cta"
                  type="text"
                  value={endCardCTA}
                  onChange={(e) => setEndCardCTA(e.target.value)}
                  placeholder="Subscribe for more"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel} htmlFor="end-card-youtube">YouTube</label>
                  <input
                    id="end-card-youtube"
                    type="text"
                    value={endCardYouTube}
                    onChange={(e) => setEndCardYouTube(e.target.value)}
                    placeholder="@handle"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={tinyLabel} htmlFor="end-card-instagram">Instagram</label>
                  <input
                    id="end-card-instagram"
                    type="text"
                    value={endCardInstagram}
                    onChange={(e) => setEndCardInstagram(e.target.value)}
                    placeholder="@handle"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={tinyLabel} htmlFor="end-card-tiktok">TikTok</label>
                  <input
                    id="end-card-tiktok"
                    type="text"
                    value={endCardTikTok}
                    onChange={(e) => setEndCardTikTok(e.target.value)}
                    placeholder="@handle"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={tinyLabel} htmlFor="end-card-twitter">Twitter</label>
                  <input
                    id="end-card-twitter"
                    type="text"
                    value={endCardX}
                    onChange={(e) => setEndCardX(e.target.value)}
                    placeholder="@handle"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ width: 140 }}>
                <label style={tinyLabel}>Duration</label>
                <select
                  value={endCardDuration}
                  onChange={(e) => setEndCardDuration(Number(e.target.value))}
                  style={selectStyle}
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={8}>8s</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            8. LOGO & WATERMARK
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Image size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Logo &amp; Watermark</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Logo upload */}
            <div>
              <span style={subLabel}>Logo</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/svg+xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setLogoUploaded(true);
                    toast.success('Logo uploaded');
                  }
                }}
              />
              {!logoUploaded ? (
                <div style={{ ...dropZone, height: 140 }} onClick={() => logoInputRef.current?.click()}>
                  <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Drop PNG or SVG here
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>or click to browse</span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      height: 140,
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '0.5px solid var(--border)',
                    }}
                  >
                    <Image size={48} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      type="button"
                      style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <RefreshCw size={11} /> Replace
                    </button>
                    <button
                      type="button"
                      style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}
                      onClick={handleExtractColors}
                    >
                      <Pipette size={11} /> Extract brand colors
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Watermark settings */}
            <div>
              <span style={subLabel}>Watermark Settings</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Position */}
                <div>
                  <label style={tinyLabel}>Position</label>
                  <select
                    value={watermarkPosition}
                    onChange={(e) => setWatermarkPosition(e.target.value as WatermarkPosition)}
                    style={selectStyle}
                  >
                    <option value="top-left">Top-left</option>
                    <option value="top-right">Top-right</option>
                    <option value="bottom-left">Bottom-left</option>
                    <option value="bottom-right">Bottom-right</option>
                    <option value="center">Center</option>
                  </select>
                </div>

                {/* Opacity */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Opacity</label>
                    <span
                      style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}
                    >
                      {watermarkOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    aria-label="Watermark opacity"
                    aria-valuenow={watermarkOpacity}
                    aria-valuemin={5}
                    aria-valuemax={100}
                    style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                </div>

                {/* Size */}
                <div>
                  <label style={tinyLabel}>Size</label>
                  <RadioGroup
                    options={[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ]}
                    value={watermarkSize}
                    onChange={(v) => setWatermarkSize(v as WatermarkSize)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Safe Zone visual editor */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={subLabel}>Safe Zone (16:9 preview)</span>
              <button
                type="button"
                style={{ ...ghostBtn, fontSize: 10 }}
                onClick={() => {
                  setSafeZoneMargins({ top: 5, bottom: 10, left: 5, right: 5 });
                  toast.info('Safe zone reset to defaults');
                }}
              >
                <RefreshCw size={10} /> Reset to defaults
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* 16:9 preview frame */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#111',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                }}
              >
                {/* Green dashed safe area overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${safeZoneMargins.top}%`,
                    bottom: `${safeZoneMargins.bottom}%`,
                    left: `${safeZoneMargins.left}%`,
                    right: `${safeZoneMargins.right}%`,
                    border: '1.5px dashed rgba(52,211,153,0.7)',
                    background: 'rgba(52,211,153,0.05)',
                    borderRadius: 2,
                  }}
                />
                {/* Red danger zones */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${safeZoneMargins.top}%`,
                    background: 'rgba(239,68,68,0.1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${safeZoneMargins.bottom}%`,
                    background: 'rgba(239,68,68,0.1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: `${safeZoneMargins.top}%`,
                    bottom: `${safeZoneMargins.bottom}%`,
                    left: 0,
                    width: `${safeZoneMargins.left}%`,
                    background: 'rgba(239,68,68,0.1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: `${safeZoneMargins.top}%`,
                    bottom: `${safeZoneMargins.bottom}%`,
                    right: 0,
                    width: `${safeZoneMargins.right}%`,
                    background: 'rgba(239,68,68,0.1)',
                  }}
                />
                {/* Logo icon at watermark position */}
                {(() => {
                  const sizePx =
                    watermarkSize === 'small' ? 18 : watermarkSize === 'medium' ? 28 : 40;
                  const wrapperStyle: React.CSSProperties = {
                    position: 'absolute',
                    opacity: watermarkOpacity / 100,
                    padding: 4,
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  };
                  const posStyles: Record<WatermarkPosition, React.CSSProperties> = {
                    'top-left': { top: `${safeZoneMargins.top}%`, left: `${safeZoneMargins.left}%` },
                    'top-right': {
                      top: `${safeZoneMargins.top}%`,
                      right: `${safeZoneMargins.right}%`,
                    },
                    'bottom-left': {
                      bottom: `${safeZoneMargins.bottom}%`,
                      left: `${safeZoneMargins.left}%`,
                    },
                    'bottom-right': {
                      bottom: `${safeZoneMargins.bottom}%`,
                      right: `${safeZoneMargins.right}%`,
                    },
                    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
                  };
                  return (
                    <div style={{ ...wrapperStyle, ...posStyles[watermarkPosition] }}>
                      <Image size={sizePx} style={{ color: '#fff' }} />
                    </div>
                  );
                })()}
              </div>

              {/* Margin sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                  <div key={side}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 2,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {side} margin
                      </label>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {safeZoneMargins[side]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={safeZoneMargins[side]}
                      onChange={(e) =>
                        setSafeZoneMargins((p) => ({ ...p, [side]: Number(e.target.value) }))
                      }
                      aria-label={`Safe zone ${side} margin (percent)`}
                      aria-valuenow={safeZoneMargins[side]}
                      aria-valuemin={0}
                      aria-valuemax={30}
                      style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
