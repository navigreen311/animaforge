'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ── Constants ──────────────────────────────────────────────── */

const HAIRSTYLES = [
  'Short Crop', 'Buzz Cut', 'Curly Bob', 'Long Straight', 'Side Swept',
  'Top Knot', 'Afro', 'Box Braids', 'Locs', 'Undercut',
  'Ponytail', 'Pixie', 'Mohawk', 'Shag', 'Cornrows',
  'French Braid', 'Dreadlocks', 'Crew Cut', 'Fade', 'Messy Bun',
] as const;

const NATURAL_COLORS = [
  { label: 'Black', hex: '#1a1a2e' },
  { label: 'Dark Brown', hex: '#3b2314' },
  { label: 'Brown', hex: '#8B4513' },
  { label: 'Auburn', hex: '#A0522D' },
  { label: 'Ginger', hex: '#D2691E' },
  { label: 'Blonde', hex: '#DAA520' },
  { label: 'Platinum', hex: '#E8E4D9' },
  { label: 'Grey', hex: '#A9A9A9' },
];

const FASHION_COLORS = [
  { label: 'Pink', hex: '#FF69B4' },
  { label: 'Blue', hex: '#4169E1' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Green', hex: '#22C55E' },
  { label: 'Red', hex: '#DC143C' },
  { label: 'White', hex: '#F5F5F5' },
];

const TEXTURES = ['Straight', 'Wavy', 'Curly', 'Coiled'] as const;

const FACIAL_HAIR_STYLES = ['None', 'Stubble', 'Short Beard', 'Full Beard', 'Mustache', 'Goatee'] as const;

const ACCESSORIES = ['None', 'Clips', 'Headband', 'Cap', 'Beanie', 'Hijab', 'Other'] as const;

/* ── Types ──────────────────────────────────────────────────── */

export interface HairState {
  style: string;
  color: string;
  customHex: string;
  highlightsEnabled: boolean;
  highlightColor: string;
  texture: (typeof TEXTURES)[number];
  length: number;
  volume: number;
  shine: number;
  facialHairStyle: (typeof FACIAL_HAIR_STYLES)[number];
  accessory: (typeof ACCESSORIES)[number];
}

const DEFAULT_STATE: HairState = {
  style: 'Short Crop',
  color: '#1a1a2e',
  customHex: '',
  highlightsEnabled: false,
  highlightColor: '#DAA520',
  texture: 'Straight',
  length: 40,
  volume: 50,
  shine: 50,
  facialHairStyle: 'None',
  accessory: 'None',
};

/* ── Component ──────────────────────────────────────────────── */

export default function HairTab() {
  const [state, setState] = useState<HairState>(DEFAULT_STATE);
  const [facialHairOpen, setFacialHairOpen] = useState(false);
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((patch: Partial<HairState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /* auto-save debounced 800ms */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // TODO: persist state (API call)
      console.log('[HairTab] auto-save', state);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  /* ── Section header style ─────────────────────────────────── */
  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 10,
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ── Style Grid (4x5) ─────────────────────────────────── */}
      <div>
        <h4 style={sectionTitle}>Hairstyle</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {HAIRSTYLES.map((name) => {
            const selected = state.style === name;
            return (
              <button
                key={name}
                onClick={() => update({ style: name })}
                style={{
                  padding: '12px 6px',
                  fontSize: 11,
                  fontWeight: 500,
                  textAlign: 'center',
                  borderRadius: 'var(--radius-md)',
                  border: selected ? '2px solid var(--brand-border)' : '1px solid var(--border)',
                  backgroundColor: selected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                  color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  lineHeight: 1.3,
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Color Section ────────────────────────────────────── */}
      <div>
        <h4 style={sectionTitle}>Hair Color</h4>

        {/* Natural Colors */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Natural</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {NATURAL_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => update({ color: c.hex })}
              title={c.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: state.color === c.hex ? '3px solid var(--brand-light)' : '2px solid var(--border)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Fashion Colors */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Fashion</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {FASHION_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => update({ color: c.hex })}
              title={c.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: state.color === c.hex ? '3px solid var(--brand-light)' : '2px solid var(--border)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Custom Hex + Color Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Custom:</span>
          <input
            type="color"
            value={state.customHex || state.color}
            onChange={(e) => update({ color: e.target.value, customHex: e.target.value })}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          />
          <input
            type="text"
            placeholder="#FF5500"
            value={state.customHex}
            onChange={(e) => update({ customHex: e.target.value })}
            maxLength={7}
            style={{
              width: 90,
              padding: '4px 8px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          />
          {state.customHex.match(/^#[0-9A-Fa-f]{6}$/) && (
            <button
              onClick={() => update({ color: state.customHex })}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--brand)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
          )}
        </div>

        {/* Highlights / Ombre toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button
            onClick={() => update({ highlightsEnabled: !state.highlightsEnabled })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: state.highlightsEnabled ? 'var(--bg-active)' : 'var(--bg-surface)',
              color: state.highlightsEnabled ? 'var(--text-brand)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                backgroundColor: state.highlightsEnabled ? 'var(--brand)' : 'var(--border-strong)',
                position: 'relative',
                transition: 'background-color 0.2s',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: state.highlightsEnabled ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </div>
            Highlights / Ombre
          </button>

          {state.highlightsEnabled && (
            <input
              type="color"
              value={state.highlightColor}
              onChange={(e) => update({ highlightColor: e.target.value })}
              style={{
                width: 32,
                height: 32,
                padding: 0,
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
              title="Highlight color"
            />
          )}
        </div>
      </div>

      {/* ── Properties ───────────────────────────────────────── */}
      <div>
        <h4 style={sectionTitle}>Properties</h4>

        {/* Texture segmented */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Texture</p>
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 16 }}>
          {TEXTURES.map((t) => (
            <button
              key={t}
              onClick={() => update({ texture: t })}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: state.texture === t ? 'var(--bg-elevated)' : 'transparent',
                color: state.texture === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Length slider */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Length: {state.length}%</p>
        <input
          type="range"
          min={0}
          max={100}
          value={state.length}
          onChange={(e) => update({ length: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--brand)', marginBottom: 12 }}
        />

        {/* Volume slider */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Volume: {state.volume}%</p>
        <input
          type="range"
          min={0}
          max={100}
          value={state.volume}
          onChange={(e) => update({ volume: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--brand)', marginBottom: 12 }}
        />

        {/* Shine slider */}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Shine: {state.shine}%</p>
        <input
          type="range"
          min={0}
          max={100}
          value={state.shine}
          onChange={(e) => update({ shine: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--brand)' }}
        />
      </div>

      {/* ── Facial Hair (collapsible) ────────────────────────── */}
      <div>
        <button
          onClick={() => setFacialHairOpen(!facialHairOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {facialHairOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Facial Hair
        </button>
        {facialHairOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {FACIAL_HAIR_STYLES.map((s) => {
              const selected = state.facialHairStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => update({ facialHairStyle: s })}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: selected ? '1px solid var(--brand-border)' : '1px solid var(--border)',
                    backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
                    color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Accessories (collapsible) ────────────────────────── */}
      <div>
        <button
          onClick={() => setAccessoriesOpen(!accessoriesOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {accessoriesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Accessories
        </button>
        {accessoriesOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {ACCESSORIES.map((a) => {
              const selected = state.accessory === a;
              return (
                <button
                  key={a}
                  onClick={() => update({ accessory: a })}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: selected ? '1px solid var(--brand-border)' : '1px solid var(--border)',
                    backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
                    color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
