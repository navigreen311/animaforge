'use client';

import { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

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
  { role: 'Primary', family: 'DM Sans' },
  { role: 'Secondary', family: 'Inter' },
  { role: 'Display', family: 'Space Grotesk' },
];

const INITIAL_FONT_SIZES: FontSize[] = [
  { label: 'H1', size: 32 },
  { label: 'H2', size: 24 },
  { label: 'H3', size: 18 },
  { label: 'Body', size: 14 },
  { label: 'Small', size: 12 },
  { label: 'Micro', size: 10 },
];

const BRAND_KITS = ['AnimaForge Studio', 'Client - Acme Corp', 'Personal Brand'];

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

// ── Color Editor Modal ───────────────────────────────────────────
function ColorEditor({
  color,
  onSave,
  onCancel,
}: {
  color: BrandColor;
  onSave: (c: BrandColor) => void;
  onCancel: () => void;
}) {
  const [hex, setHex] = useState(color.hex);
  const [label, setLabel] = useState(color.label);
  const [opacity, setOpacity] = useState(100);

  // Simple hex to HSL approximation for display
  const hexClean = hex.replace('#', '');
  const r = parseInt(hexClean.substring(0, 2), 16) || 0;
  const g = parseInt(hexClean.substring(2, 4), 16) || 0;
  const b = parseInt(hexClean.substring(4, 6), 16) || 0;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = Math.round(((max + min) / 2) * 100);
  const s = max === min ? 0 : Math.round((l > 50 ? (max - min) / (2 - max - min) : (max - min) / (max + min)) * 100);
  let h = 0;
  if (max !== min) {
    if (max === rn) h = ((gn - bn) / (max - min)) * 60;
    else if (max === gn) h = (2 + (bn - rn) / (max - min)) * 60;
    else h = (4 + (rn - gn) / (max - min)) * 60;
    if (h < 0) h += 360;
  }
  const hue = Math.round(h);
  const sat = s;
  const lig = l;

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

        {/* Preview */}
        <div
          style={{
            width: '100%',
            height: 60,
            borderRadius: 'var(--radius-md)',
            background: hex,
            opacity: opacity / 100,
            border: '0.5px solid var(--border)',
          }}
        />

        {/* Hex input */}
        <div>
          <label style={tinyLabel}>Hex</label>
          <input
            type="text"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace' }}
          />
        </div>

        {/* Label input */}
        <div>
          <label style={tinyLabel}>Label</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
        </div>

        {/* HSL sliders (display) */}
        <div>
          <label style={tinyLabel}>Hue: {hue}</label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            readOnly
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
            readOnly
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
            readOnly
            style={{ width: '100%', accentColor: hex, cursor: 'pointer' }}
          />
        </div>

        {/* Opacity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Opacity</label>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              {opacity}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
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
              onSave({ ...color, hex, label });
              toast.success(`Updated ${color.role} color`);
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

// ── Main Page Component ──────────────────────────────────────────
export default function BrandKitPage() {
  // Kit switcher
  const [activeKit, setActiveKit] = useState(BRAND_KITS[0]);
  const [kitDropdownOpen, setKitDropdownOpen] = useState(false);

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

  // Typography
  const [fonts, setFonts] = useState<FontSlot[]>(INITIAL_FONTS);
  const [fontSizes, setFontSizes] = useState<FontSize[]>(INITIAL_FONT_SIZES);
  const [editingSizeIdx, setEditingSizeIdx] = useState<number | null>(null);
  const [editingSizeVal, setEditingSizeVal] = useState('');

  // Sonic branding
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [sonicToggles, setSonicToggles] = useState({
    prepend: true,
    watermark: false,
    append: false,
  });
  const [sonicVolume, setSonicVolume] = useState(80);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Lower third
  const [lowerThirdName, setLowerThirdName] = useState('Jane Doe');
  const [lowerThirdTitle, setLowerThirdTitle] = useState('Creative Director');
  const [lowerThirdBarColor, setLowerThirdBarColor] = useState('#7c3aed');
  const [lowerThirdFont, setLowerThirdFont] = useState('DM Sans');
  const [lowerThirdPosition, setLowerThirdPosition] = useState<LowerThirdPosition>('bottom-left');
  const [lowerThirdAnimation, setLowerThirdAnimation] = useState<Animation>('slide');
  const [lowerThirdDuration, setLowerThirdDuration] = useState(5);

  // End card
  const [endCardLogoPos, setEndCardLogoPos] = useState('center');
  const [endCardCTA, setEndCardCTA] = useState('Subscribe for more');
  const [endCardYouTube, setEndCardYouTube] = useState('');
  const [endCardInstagram, setEndCardInstagram] = useState('');
  const [endCardTikTok, setEndCardTikTok] = useState('');
  const [endCardX, setEndCardX] = useState('');
  const [endCardBg, setEndCardBg] = useState('#0a0a0f');
  const [endCardDuration, setEndCardDuration] = useState(8);

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

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
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
                {activeKit}
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
                    minWidth: 200,
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {BRAND_KITS.map((kit) => (
                    <button
                      key={kit}
                      type="button"
                      onClick={() => {
                        setActiveKit(kit);
                        setKitDropdownOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: activeKit === kit ? 'var(--brand-dim)' : 'transparent',
                        color: activeKit === kit ? 'var(--text-brand)' : 'var(--text-primary)',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {kit}
                    </button>
                  ))}
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={() => {
                      toast.info('Create new brand kit');
                      setKitDropdownOpen(false);
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
                    <Plus size={12} /> Create new
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toast.success('Style guide exported')}
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
            3. BRAND VOICE
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Brand Voice</span>
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
                    <button type="button" style={chipDeleteBtn} onClick={() => removeChip(brandKeywords, setBrandKeywords, i)}>
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
                    <button type="button" style={{ ...chipDeleteBtn, color: '#fca5a5' }} onClick={() => removeChip(avoidWords, setAvoidWords, i)}>
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
              <label style={subLabel}>Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your brand tagline..."
                style={inputStyle}
              />
            </div>

            {/* Mission */}
            <div>
              <label style={subLabel}>Mission</label>
              <input
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {f.role}
                  </span>
                  <button
                    type="button"
                    style={{ ...ghostBtn, padding: '2px 8px', fontSize: 10 }}
                    onClick={() => toast.info(`Change ${f.role} font`)}
                  >
                    Change
                  </button>
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: `"${f.family}", sans-serif`,
                    display: 'block',
                  }}
                >
                  {f.family}
                </span>
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
            <Mic2 size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Sonic Branding</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Audio upload zone */}
            <div>
              <span style={subLabel}>Brand Audio</span>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={{ display: 'none' }}
                onChange={handleAudioUpload}
              />
              {!audioTrack ? (
                <div
                  style={{ ...dropZone, height: 100 }}
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Drop MP3 or WAV (max 5 MB)
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
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
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {audioTrack.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{audioTrack.duration}</div>
                  </div>
                  <button type="button" style={ghostBtn} onClick={() => audioInputRef.current?.click()}>
                    <RefreshCw size={10} /> Replace
                  </button>
                  <button
                    type="button"
                    style={{ ...ghostBtn, color: '#fca5a5' }}
                    onClick={() => {
                      setAudioTrack(null);
                      setAudioPlaying(false);
                    }}
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* Usage toggles & volume */}
            <div>
              <span style={subLabel}>Usage</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Prepend to exports</span>
                  <Toggle checked={sonicToggles.prepend} onChange={(v) => setSonicToggles((p) => ({ ...p, prepend: v }))} />
                </div>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Audio watermark (-20 dB)</span>
                  <Toggle checked={sonicToggles.watermark} onChange={(v) => setSonicToggles((p) => ({ ...p, watermark: v }))} />
                </div>
                <div style={toggleRow}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Append to exports</span>
                  <Toggle checked={sonicToggles.append} onChange={(v) => setSonicToggles((p) => ({ ...p, append: v }))} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Volume</label>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{sonicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sonicVolume}
                  onChange={(e) => setSonicVolume(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            6. LOWER THIRD TEMPLATE
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <LayoutTemplate size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>Lower Third Template</span>
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
                      background: lowerThirdBarColor,
                      padding: '6px 14px 3px',
                      borderRadius: '4px 4px 0 0',
                      fontFamily: `"${lowerThirdFont}", sans-serif`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{lowerThirdName}</div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      padding: '3px 14px 5px',
                      borderRadius: '0 0 4px 4px',
                      fontFamily: `"${lowerThirdFont}", sans-serif`,
                    }}
                  >
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)' }}>{lowerThirdTitle}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={tinyLabel}>Name</label>
                <input type="text" value={lowerThirdName} onChange={(e) => setLowerThirdName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={tinyLabel}>Title</label>
                <input type="text" value={lowerThirdTitle} onChange={(e) => setLowerThirdTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel}>Bar Color</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={lowerThirdBarColor}
                      onChange={(e) => setLowerThirdBarColor(e.target.value)}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{lowerThirdBarColor}</span>
                  </div>
                </div>
                <div>
                  <label style={tinyLabel}>Font</label>
                  <select value={lowerThirdFont} onChange={(e) => setLowerThirdFont(e.target.value)} style={selectStyle}>
                    {fonts.map((f) => (
                      <option key={f.family} value={f.family}>{f.family}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel}>Position</label>
                  <select value={lowerThirdPosition} onChange={(e) => setLowerThirdPosition(e.target.value as LowerThirdPosition)} style={selectStyle}>
                    <option value="bottom-left">Bottom-left</option>
                    <option value="bottom-center">Bottom-center</option>
                    <option value="bottom-right">Bottom-right</option>
                  </select>
                </div>
                <div>
                  <label style={tinyLabel}>Animation</label>
                  <select value={lowerThirdAnimation} onChange={(e) => setLowerThirdAnimation(e.target.value as Animation)} style={selectStyle}>
                    <option value="slide">Slide</option>
                    <option value="fade">Fade</option>
                    <option value="wipe">Wipe</option>
                  </select>
                </div>
                <div>
                  <label style={tinyLabel}>Duration (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={lowerThirdDuration}
                    onChange={(e) => setLowerThirdDuration(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            7. END CARD TEMPLATE
        ══════════════════════════════════════════════════════════ */}
        <div style={sectionBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Monitor size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={sectionTitle}>End Card Template</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
            {/* Live preview */}
            <div>
              <span style={subLabel}>Preview</span>
              <div
                style={{
                  width: 400,
                  height: 225,
                  background: endCardBg,
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {/* Logo placeholder */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(endCardLogoPos === 'top-left' ? { position: 'absolute', top: 16, left: 16 } :
                      endCardLogoPos === 'top-right' ? { position: 'absolute', top: 16, right: 16 } :
                      {}),
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>A</span>
                </div>

                {/* CTA */}
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'center' }}>
                  {endCardCTA}
                </div>

                {/* Socials */}
                <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                  {endCardYouTube && <span>YT: {endCardYouTube}</span>}
                  {endCardInstagram && <span>IG: {endCardInstagram}</span>}
                  {endCardTikTok && <span>TT: {endCardTikTok}</span>}
                  {endCardX && <span>X: {endCardX}</span>}
                  {!endCardYouTube && !endCardInstagram && !endCardTikTok && !endCardX && (
                    <span>Add social handles</span>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel}>Logo Position</label>
                  <select value={endCardLogoPos} onChange={(e) => setEndCardLogoPos(e.target.value)} style={selectStyle}>
                    <option value="center">Center</option>
                    <option value="top-left">Top-left</option>
                    <option value="top-right">Top-right</option>
                  </select>
                </div>
                <div>
                  <label style={tinyLabel}>Background</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={endCardBg}
                      onChange={(e) => setEndCardBg(e.target.value)}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{endCardBg}</span>
                  </div>
                </div>
              </div>
              <div>
                <label style={tinyLabel}>CTA Text</label>
                <input type="text" value={endCardCTA} onChange={(e) => setEndCardCTA(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={tinyLabel}>YouTube</label>
                  <input type="text" value={endCardYouTube} onChange={(e) => setEndCardYouTube(e.target.value)} placeholder="@handle" style={inputStyle} />
                </div>
                <div>
                  <label style={tinyLabel}>Instagram</label>
                  <input type="text" value={endCardInstagram} onChange={(e) => setEndCardInstagram(e.target.value)} placeholder="@handle" style={inputStyle} />
                </div>
                <div>
                  <label style={tinyLabel}>TikTok</label>
                  <input type="text" value={endCardTikTok} onChange={(e) => setEndCardTikTok(e.target.value)} placeholder="@handle" style={inputStyle} />
                </div>
                <div>
                  <label style={tinyLabel}>X</label>
                  <input type="text" value={endCardX} onChange={(e) => setEndCardX(e.target.value)} placeholder="@handle" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={tinyLabel}>Duration (s)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={endCardDuration}
                  onChange={(e) => setEndCardDuration(Number(e.target.value))}
                  style={{ ...inputStyle, width: 80 }}
                />
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
            {/* Logo drop zone */}
            <div>
              <span style={subLabel}>Logo</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setLogoUploaded(true);
                    toast.success('Logo uploaded');
                  }
                }}
              />
              {!logoUploaded ? (
                <div style={{ ...dropZone, height: 120 }} onClick={() => logoInputRef.current?.click()}>
                  <Image size={24} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Drop logo here</span>
                </div>
              ) : (
                <div style={{ height: 120, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Image size={32} style={{ color: 'var(--brand)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>Logo uploaded</span>
                  <button type="button" style={{ ...ghostBtn, fontSize: 10 }} onClick={() => setLogoUploaded(false)}>
                    Remove
                  </button>
                </div>
              )}
              <button
                type="button"
                style={{ ...ghostBtn, marginTop: 8, width: '100%', justifyContent: 'center' }}
                onClick={handleExtractColors}
              >
                <Pipette size={11} />
                Extract brand colors
              </button>
            </div>

            {/* Safe zone preview & watermark */}
            <div>
              <span style={subLabel}>Safe Zone (16:9 frame)</span>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#111',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--border)',
                  maxHeight: 180,
                }}
              >
                {/* Green safe zone */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${safeZoneMargins.top}%`,
                    bottom: `${safeZoneMargins.bottom}%`,
                    left: `${safeZoneMargins.left}%`,
                    right: `${safeZoneMargins.right}%`,
                    border: '1px dashed rgba(52,211,153,0.5)',
                    background: 'rgba(52,211,153,0.05)',
                    borderRadius: 2,
                  }}
                />
                {/* Red danger zones */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${safeZoneMargins.top}%`, background: 'rgba(239,68,68,0.1)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${safeZoneMargins.bottom}%`, background: 'rgba(239,68,68,0.1)' }} />
                <div style={{ position: 'absolute', top: `${safeZoneMargins.top}%`, bottom: `${safeZoneMargins.bottom}%`, left: 0, width: `${safeZoneMargins.left}%`, background: 'rgba(239,68,68,0.1)' }} />
                <div style={{ position: 'absolute', top: `${safeZoneMargins.top}%`, bottom: `${safeZoneMargins.bottom}%`, right: 0, width: `${safeZoneMargins.right}%`, background: 'rgba(239,68,68,0.1)' }} />
              </div>

              {/* Margin sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                  <div key={side}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <label style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{side}</label>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{safeZoneMargins[side]}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={safeZoneMargins[side]}
                      onChange={(e) => setSafeZoneMargins((p) => ({ ...p, [side]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Watermark settings */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
            <span style={subLabel}>Watermark Settings</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
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
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{watermarkOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
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
      </main>
    </div>
  );
}
