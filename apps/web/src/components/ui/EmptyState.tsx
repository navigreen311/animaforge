'use client';

import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActionDef {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ActionDef;
  secondaryAction?: ActionDef;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 12,
      }}
    >
      {/* ── Icon circle ─────────────────────────────── */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--brand-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icon size={24} style={{ color: 'var(--brand-light)' }} />
      </div>

      {/* ── Title ────────────────────────────────────── */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        {title}
      </h2>

      {/* ── Description ──────────────────────────────── */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          margin: 0,
          textAlign: 'center',
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {/* ── Actions ──────────────────────────────────── */}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                background: 'var(--brand)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              style={{
                background: 'transparent',
                border: '0.5px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '7px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
