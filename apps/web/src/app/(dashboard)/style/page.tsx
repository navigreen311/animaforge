'use client';

import { useState } from 'react';
import { Palette, Download, Check } from 'lucide-react';

/* ── Sample Data ──────────────────────────────────────────────── */

const TABS = ['Clone Style', 'Cartoon Pro', 'Style Library'] as const;
type Tab = (typeof TABS)[number];

interface StylePack {
  id: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  downloads: number;
  applied: boolean;
}

const STYLE_PACKS: StylePack[] = [
  {
    id: 'cyberpunk-neon',
    title: 'Cyberpunk Neon',
    description: 'Glowing neon edges, dark backgrounds',
    gradientFrom: '#0f0a2e',
    gradientTo: '#1a0a3e',
    downloads: 12_840,
    applied: false,
  },
  {
    id: 'watercolor-dream',
    title: 'Watercolor Dream',
    description: 'Soft watercolor strokes',
    gradientFrom: '#0a1f0a',
    gradientTo: '#0d2b0d',
    downloads: 9_320,
    applied: false,
  },
  {
    id: 'anime-classic',
    title: 'Anime Classic',
    description: 'Clean line art, cel shading',
    gradientFrom: '#1a0a2e',
    gradientTo: '#2e0a1a',
    downloads: 18_560,
    applied: false,
  },
  {
    id: 'film-noir',
    title: 'Film Noir',
    description: 'High contrast, dramatic shadows',
    gradientFrom: '#0a0a0f',
    gradientTo: '#1a1a1a',
    downloads: 7_150,
    applied: false,
  },
  {
    id: 'pixel-retro',
    title: 'Pixel Retro',
    description: '8-bit style, sharp pixels',
    gradientFrom: '#0a2e0a',
    gradientTo: '#1a3e1a',
    downloads: 5_980,
    applied: false,
  },
  {
    id: 'oil-painting',
    title: 'Oil Painting',
    description: 'Rich textures, visible brushstrokes',
    gradientFrom: '#2e1a0a',
    gradientTo: '#3e2a1a',
    downloads: 11_200,
    applied: false,
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDownloads(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ── Component ────────────────────────────────────────────────── */

export default function StyleStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Style Library');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  function handleApply(id: string) {
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={20} style={{ color: 'var(--text-brand)' }} />
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Style Studio
            </h1>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0',
              }}
            >
              Extract, create, and apply visual styles
            </p>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '0.5px solid var(--border)',
            paddingBottom: 0,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: isActive ? 'var(--brand-dim)' : 'transparent',
                  border: isActive
                    ? '0.5px solid var(--brand-border)'
                    : '0.5px solid transparent',
                  color: isActive ? 'var(--text-brand)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ───────────────────────────────── */}
        {activeTab === 'Style Library' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {STYLE_PACKS.map((pack) => {
              const isApplied = appliedIds.has(pack.id);
              return (
                <div
                  key={pack.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-brand)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Gradient Preview */}
                  <div
                    style={{
                      height: 80,
                      background: `linear-gradient(135deg, ${pack.gradientFrom}, ${pack.gradientTo})`,
                      position: 'relative',
                    }}
                  >
                    {isApplied && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'var(--brand)',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      {pack.title}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        margin: '4px 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {pack.description}
                    </p>

                    {/* Footer: Apply + Downloads */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleApply(pack.id)}
                        style={{
                          background: isApplied ? 'var(--brand-dim)' : 'var(--brand)',
                          color: isApplied ? 'var(--text-brand)' : '#ffffff',
                          border: isApplied
                            ? '0.5px solid var(--brand-border)'
                            : 'none',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'opacity 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                        }}
                      >
                        {isApplied ? (
                          <>
                            <Check size={10} />
                            Applied
                          </>
                        ) : (
                          'Apply'
                        )}
                      </button>

                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Download size={10} />
                        {formatDownloads(pack.downloads)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'Clone Style' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: 8,
            }}
          >
            <Palette size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Upload a reference image to clone its visual style
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              Coming soon
            </p>
          </div>
        )}

        {activeTab === 'Cartoon Pro' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: 8,
            }}
          >
            <Palette size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Advanced cartoon stylization with AI
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              Coming soon
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
