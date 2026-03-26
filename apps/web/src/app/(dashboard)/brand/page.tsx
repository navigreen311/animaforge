'use client';

import { useState } from 'react';
import { Palette, Type, Image, Plus } from 'lucide-react';

// ── Sample Data ───────────────────────────────────────────────
interface ColorSwatch {
  name: string;
  hex: string;
}

const COLORS: ColorSwatch[] = [
  { name: 'Primary', hex: '#7c3aed' },
  { name: 'Secondary', hex: '#06b6d4' },
  { name: 'Accent', hex: '#f59e0b' },
  { name: 'Dark', hex: '#0a0a0f' },
  { name: 'Light', hex: '#e2e8f0' },
  { name: 'Success', hex: '#10b981' },
];

interface FontSize {
  label: string;
  size: number;
}

const FONT_SIZES: FontSize[] = [
  { label: 'H1', size: 32 },
  { label: 'H2', size: 24 },
  { label: 'H3', size: 18 },
  { label: 'Body', size: 14 },
  { label: 'Small', size: 12 },
  { label: 'Micro', size: 10 },
];

type WatermarkSize = 'small' | 'medium' | 'large';

// ── Component ─────────────────────────────────────────────────
export default function BrandKitPage() {
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(30);
  const [watermarkSize, setWatermarkSize] = useState<WatermarkSize>('small');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
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
        {/* ── Page Header ───────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Brand Kit
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
            }}
          >
            Define your visual identity
          </p>
        </div>

        {/* ── Grid Layout ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* ── Color Palette Section ─────────────────── */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
            }}
          >
            {/* Section heading */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={14} style={{ color: 'var(--text-secondary)' }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Colors
                </span>
              </div>
              <button
                type="button"
                style={{
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
                }}
              >
                <Plus size={11} />
                Add Color
              </button>
            </div>

            {/* Swatch row */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {COLORS.map((color) => (
                <div
                  key={color.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: color.hex,
                      border:
                        color.hex === '#0a0a0f'
                          ? '1px solid var(--border)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease',
                    }}
                    title={`${color.name}: ${color.hex}`}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {color.hex}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Typography Section ────────────────────── */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
            }}
          >
            {/* Section heading */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Type size={14} style={{ color: 'var(--text-secondary)' }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Fonts
              </span>
            </div>

            {/* Primary font */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Primary Font
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  DM Sans
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </span>
              </div>
            </div>

            {/* Mono font */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Mono Font
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  JetBrains Mono
                </span>
              </div>
              <div
                style={{
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  const render = await forge.generate(prompt);
                </span>
              </div>
            </div>

            {/* Font sizes reference */}
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Size Scale
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FONT_SIZES.map((fs) => (
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
                      minWidth: 48,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {fs.label}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {fs.size}px
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Logo & Watermark Section ──────────────── */}
          <div
            style={{
              gridColumn: '1 / -1',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
            }}
          >
            {/* Section heading */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Image size={14} style={{ color: 'var(--text-secondary)' }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Logo & Watermark
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              {/* Logo upload area */}
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Logo
                </span>
                <div
                  style={{
                    height: 120,
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <Image size={24} style={{ color: 'var(--text-tertiary)' }} />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Drop logo here
                  </span>
                </div>
              </div>

              {/* Watermark settings */}
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Watermark Settings
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Position dropdown */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Position
                    </label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-hover)',
                        color: 'var(--text-primary)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="top-left">Top-left</option>
                      <option value="top-right">Top-right</option>
                      <option value="bottom-left">Bottom-left</option>
                      <option value="bottom-right">Bottom-right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  {/* Opacity slider */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Opacity
                      </label>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {watermarkOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: 'var(--brand)',
                        cursor: 'pointer',
                      }}
                    />
                  </div>

                  {/* Size toggle */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Size
                    </label>
                    <div style={{ display: 'flex', gap: 0 }}>
                      {(['small', 'medium', 'large'] as WatermarkSize[]).map(
                        (size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setWatermarkSize(size)}
                            style={{
                              background:
                                watermarkSize === size
                                  ? 'var(--brand)'
                                  : 'var(--bg-hover)',
                              color:
                                watermarkSize === size
                                  ? '#ffffff'
                                  : 'var(--text-secondary)',
                              border: '0.5px solid var(--border)',
                              padding: '4px 14px',
                              fontSize: 11,
                              fontWeight: watermarkSize === size ? 500 : 400,
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                              borderRadius:
                                size === 'small'
                                  ? 'var(--radius-md) 0 0 var(--radius-md)'
                                  : size === 'large'
                                    ? '0 var(--radius-md) var(--radius-md) 0'
                                    : '0',
                              marginLeft: size === 'small' ? 0 : -0.5,
                            }}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
