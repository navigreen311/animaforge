'use client';

import { useState } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Take {
  id: string;
  number: number;
  tier: 'Preview' | 'Standard' | 'Final';
  date: string;
  stabilityScore: number;
  thumbnailGradient: string;
  isActive: boolean;
}

export interface TakesDrawerProps {
  open: boolean;
  onClose: () => void;
  shotNumber: number;
  takes: Take[];
  onSelectTake: (takeId: string) => void;
  onGenerateNewTake: (tier: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Mock data factory                                                  */
/* ------------------------------------------------------------------ */

export function createMockTakes(shotNumber: number): Take[] {
  return [
    {
      id: `take-${shotNumber}-1`,
      number: 1,
      tier: 'Preview',
      date: '2026-04-08 14:32',
      stabilityScore: 78,
      thumbnailGradient: 'linear-gradient(135deg, #6d28d9, #1a1a2e)',
      isActive: false,
    },
    {
      id: `take-${shotNumber}-2`,
      number: 2,
      tier: 'Standard',
      date: '2026-04-08 15:10',
      stabilityScore: 88,
      thumbnailGradient: 'linear-gradient(135deg, #7c3aed, #0f172a)',
      isActive: false,
    },
    {
      id: `take-${shotNumber}-3`,
      number: 3,
      tier: 'Final',
      date: '2026-04-09 09:45',
      stabilityScore: 94,
      thumbnailGradient: 'linear-gradient(135deg, #8b5cf6, #1e1b4b)',
      isActive: true,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function tierBadgeColor(tier: string): { bg: string; fg: string } {
  switch (tier) {
    case 'Preview':
      return { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-tertiary)' };
    case 'Standard':
      return { bg: 'rgba(99,102,241,0.15)', fg: '#818cf8' };
    case 'Final':
      return { bg: 'rgba(234,179,8,0.15)', fg: '#facc15' };
    default:
      return { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-tertiary)' };
  }
}

function scoreColor(score: number): string {
  if (score >= 85) return '#4ade80';
  if (score >= 70) return '#facc15';
  return '#f87171';
}

const TIER_OPTIONS = ['Preview', 'Standard', 'Final'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TakesDrawer({
  open,
  onClose,
  shotNumber,
  takes,
  onSelectTake,
  onGenerateNewTake,
}: TakesDrawerProps) {
  const [selectedTier, setSelectedTier] = useState('Standard');
  const [tierDropdownOpen, setTierDropdownOpen] = useState(false);

  const isEmpty = takes.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 280 }}
          animate={{ x: 0 }}
          exit={{ x: 280 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 280,
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* ── Header ──────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Shot {shotNumber} &mdash; All Takes
            </h3>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Takes list ──────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {isEmpty ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 20,
                }}>
                  ?
                </div>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  No takes yet. Generate this shot to create the first take.
                </p>
              </div>
            ) : (
              takes.map((take) => {
                const badge = tierBadgeColor(take.tier);
                const sc = scoreColor(take.stabilityScore);

                return (
                  <div
                    key={take.id}
                    onClick={() => !take.isActive && onSelectTake(take.id)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '10px 16px',
                      cursor: take.isActive ? 'default' : 'pointer',
                      borderLeft: take.isActive ? '2px solid var(--brand)' : '2px solid transparent',
                      background: take.isActive ? 'rgba(124,58,237,0.06)' : 'transparent',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => {
                      if (!take.isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)');
                    }}
                    onMouseLeave={(e) => {
                      if (!take.isActive) (e.currentTarget.style.background = 'transparent');
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 60,
                      height: 34,
                      borderRadius: 4,
                      background: take.thumbnailGradient,
                      border: take.isActive
                        ? '1.5px solid var(--brand)'
                        : '1px solid var(--border)',
                      flexShrink: 0,
                    }} />

                    {/* Info */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      minWidth: 0,
                    }}>
                      {/* Row 1: Take number + tier badge + active badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}>
                          Take {take.number}
                        </span>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: badge.bg,
                          color: badge.fg,
                          textTransform: 'uppercase',
                        }}>
                          {take.tier}
                        </span>
                        {take.isActive && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: 'rgba(124,58,237,0.2)',
                            color: 'var(--brand-light)',
                            textTransform: 'uppercase',
                          }}>
                            Active
                          </span>
                        )}
                      </div>

                      {/* Row 2: Date */}
                      <span style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                      }}>
                        {take.date}
                      </span>

                      {/* Row 3: Stability score bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <div style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: 'var(--bg-elevated)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${take.stabilityScore}%`,
                            height: '100%',
                            borderRadius: 2,
                            background: sc,
                            transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: sc,
                          minWidth: 28,
                          textAlign: 'right',
                        }}>
                          {take.stabilityScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Bottom: Generate New Take ────────────────────── */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {/* Tier selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setTierDropdownOpen(!tierDropdownOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>Tier: {selectedTier}</span>
                <ChevronDown size={12} />
              </button>
              {tierDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 4,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  zIndex: 60,
                }}>
                  {TIER_OPTIONS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => {
                        setSelectedTier(tier);
                        setTierDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 11,
                        border: 'none',
                        background: selectedTier === tier ? 'rgba(124,58,237,0.15)' : 'transparent',
                        color: selectedTier === tier ? 'var(--brand-light)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={() => onGenerateNewTake(selectedTier)}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                background: 'var(--brand)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'opacity 120ms',
              }}
            >
              <Plus size={14} />
              Generate New Take
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
