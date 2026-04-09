'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Save, FolderOpen } from 'lucide-react';

/* ── Constants ──────────────────────────────────────────────── */

const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories', 'Full Outfit'] as const;
type Category = (typeof CATEGORIES)[number];

const ITEMS_BY_CATEGORY: Record<Category, string[]> = {
  Tops: ['T-Shirt', 'Button-Down', 'Hoodie', 'Sweater', 'Tank Top', 'Polo', 'Blouse', 'Jacket'],
  Bottoms: ['Jeans', 'Chinos', 'Shorts', 'Skirt', 'Sweatpants', 'Cargo Pants'],
  Outerwear: ['Trench Coat', 'Puffer Jacket', 'Blazer', 'Windbreaker', 'Pea Coat', 'Leather Jacket'],
  Footwear: ['Sneakers', 'Boots', 'Loafers', 'Sandals', 'Heels', 'Dress Shoes'],
  Accessories: ['Watch', 'Necklace', 'Bracelet', 'Sunglasses', 'Hat', 'Scarf', 'Belt', 'Bag'],
  'Full Outfit': ['Casual', 'Formal', 'Streetwear', 'Sportswear', 'Business', 'Evening'],
};

const FABRICS = ['Cotton', 'Denim', 'Leather', 'Silk', 'Synthetic', 'Knit'] as const;
const PATTERNS = ['Solid', 'Stripe', 'Plaid', 'Print'] as const;
const FITS = ['Loose', 'Regular', 'Slim', 'Fitted'] as const;

/* ── Types ──────────────────────────────────────────────────── */

interface ItemDetail {
  fabric: (typeof FABRICS)[number];
  color: string;
  pattern: (typeof PATTERNS)[number];
  fit: (typeof FITS)[number];
}

interface OutfitSelection {
  item: string;
  detail: ItemDetail;
}

interface OutfitPreset {
  id: string;
  name: string;
  selections: Partial<Record<Category, OutfitSelection>>;
}

const DEFAULT_DETAIL: ItemDetail = {
  fabric: 'Cotton',
  color: '#4a4a4a',
  pattern: 'Solid',
  fit: 'Regular',
};

/* ── Component ──────────────────────────────────────────────── */

export default function WardrobeTab() {
  const [activeCategory, setActiveCategory] = useState<Category>('Tops');
  const [selections, setSelections] = useState<Partial<Record<Category, OutfitSelection>>>({});
  const [presets, setPresets] = useState<OutfitPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSelection = selections[activeCategory];

  /* auto-save debounced 800ms */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // TODO: persist state (API call)
      console.log('[WardrobeTab] auto-save', selections);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [selections]);

  const selectItem = useCallback(
    (item: string) => {
      setSelections((prev) => {
        const existing = prev[activeCategory];
        // toggle off if same item
        if (existing?.item === item) {
          const next = { ...prev };
          delete next[activeCategory];
          return next;
        }
        return {
          ...prev,
          [activeCategory]: { item, detail: existing?.detail ?? { ...DEFAULT_DETAIL } },
        };
      });
    },
    [activeCategory],
  );

  const updateDetail = useCallback(
    (patch: Partial<ItemDetail>) => {
      setSelections((prev) => {
        const existing = prev[activeCategory];
        if (!existing) return prev;
        return {
          ...prev,
          [activeCategory]: { ...existing, detail: { ...existing.detail, ...patch } },
        };
      });
    },
    [activeCategory],
  );

  const removeChip = useCallback((cat: Category) => {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  }, []);

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: OutfitPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      selections: { ...selections },
    };
    setPresets((prev) => [...prev, preset]);
    setPresetName('');
  }, [presetName, selections]);

  const loadPreset = useCallback((preset: OutfitPreset) => {
    setSelections({ ...preset.selections });
  }, []);

  /* ── Styles ───────────────────────────────────────────────── */
  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 10,
  };

  const segmentedContainer: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-md)',
    padding: 3,
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Category Tabs (horizontal) ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: 'none',
              borderBottom: activeCategory === cat ? '2px solid var(--brand)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeCategory === cat ? 'var(--text-brand)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Outfit Summary Bar (sticky) ──────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          minHeight: 36,
          alignItems: 'center',
        }}
      >
        {Object.keys(selections).length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No items selected</span>
        )}
        {(Object.entries(selections) as [Category, OutfitSelection][]).map(([cat, sel]) => (
          <span
            key={cat}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-active)',
              color: 'var(--text-brand)',
              border: '1px solid var(--brand-border)',
            }}
          >
            {cat}: {sel.item}
            <button
              onClick={() => removeChip(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--text-brand)',
              }}
              aria-label={`Remove ${cat}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      {/* ── Item Grid (3 columns) ────────────────────────────── */}
      <div>
        <h4 style={sectionTitle}>{activeCategory}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {ITEMS_BY_CATEGORY[activeCategory].map((item) => {
            const selected = currentSelection?.item === item;
            return (
              <button
                key={item}
                onClick={() => selectItem(item)}
                style={{
                  position: 'relative',
                  padding: '16px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  textAlign: 'center',
                  borderRadius: 'var(--radius-md)',
                  border: selected ? '2px solid var(--brand-border)' : '1px solid var(--border)',
                  backgroundColor: selected ? 'var(--brand-dim)' : 'var(--bg-surface)',
                  color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {selected && (
                  <Check
                    size={14}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      color: 'var(--text-brand)',
                    }}
                  />
                )}
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Item Detail (when selected) ──────────────────────── */}
      {currentSelection && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <h4 style={{ ...sectionTitle, marginBottom: 0 }}>
            Details: {currentSelection.item}
          </h4>

          {/* Fabric segmented */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Fabric</p>
            <div style={segmentedContainer}>
              {FABRICS.map((f) => (
                <button
                  key={f}
                  onClick={() => updateDetail({ fabric: f })}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: currentSelection.detail.fabric === f ? 'var(--bg-elevated)' : 'transparent',
                    color: currentSelection.detail.fabric === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Color</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={currentSelection.detail.color}
                onChange={(e) => updateDetail({ color: e.target.value })}
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
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {currentSelection.detail.color}
              </span>
            </div>
          </div>

          {/* Pattern segmented */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Pattern</p>
            <div style={segmentedContainer}>
              {PATTERNS.map((p) => (
                <button
                  key={p}
                  onClick={() => updateDetail({ pattern: p })}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: currentSelection.detail.pattern === p ? 'var(--bg-elevated)' : 'transparent',
                    color: currentSelection.detail.pattern === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Fit segmented */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Fit</p>
            <div style={segmentedContainer}>
              {FITS.map((f) => (
                <button
                  key={f}
                  onClick={() => updateDetail({ fit: f })}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: currentSelection.detail.fit === f ? 'var(--bg-elevated)' : 'transparent',
                    color: currentSelection.detail.fit === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Presets ──────────────────────────────────────────── */}
      <div>
        <h4 style={sectionTitle}>Outfit Presets</h4>

        {/* Save current */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && savePreset()}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={savePreset}
            disabled={!presetName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--brand-border)',
              backgroundColor: presetName.trim() ? 'var(--brand)' : 'var(--bg-surface)',
              color: presetName.trim() ? '#fff' : 'var(--text-tertiary)',
              cursor: presetName.trim() ? 'pointer' : 'default',
              opacity: presetName.trim() ? 1 : 0.5,
            }}
          >
            <Save size={12} /> Save Current
          </button>
        </div>

        {/* Preset list */}
        {presets.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>
            No saved presets yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <span>{preset.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <FolderOpen size={12} /> Load
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
