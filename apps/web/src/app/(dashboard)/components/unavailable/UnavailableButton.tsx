'use client';

import React, { useId } from 'react';
import { getFeatureStatus, type FeatureKey } from './featureStatus';

/**
 * A control that cannot do its job, and says why.
 *
 * Renders a genuinely disabled button — it cannot be clicked and screen readers
 * announce it as unavailable — with the reason visible next to it rather than
 * hidden behind a tooltip. A `title` alone would be invisible on touch devices
 * and to keyboard users.
 *
 * The point is that nobody has to click it to find out it does nothing.
 */

export interface UnavailableButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'disabled'
> {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Layout of the button and its note. Defaults to stacked. */
  layout?: 'stacked' | 'inline';
  /** Hide the visible note where the surrounding layout cannot fit it. */
  hideNote?: boolean;
}

const noteStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  color: 'var(--text-tertiary)',
  maxWidth: 260,
};

export function UnavailableButton({
  feature,
  children,
  layout = 'stacked',
  hideNote = false,
  style,
  ...rest
}: UnavailableButtonProps) {
  const status = getFeatureStatus(feature);
  const noteId = useId();

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: layout === 'stacked' ? 'column' : 'row',
        alignItems: layout === 'stacked' ? 'flex-start' : 'center',
        gap: 6,
      }}
    >
      <button
        {...rest}
        type="button"
        disabled
        aria-describedby={noteId}
        title={status.detail}
        style={{
          ...style,
          opacity: 0.55,
          cursor: 'not-allowed',
        }}
      >
        {children}
      </button>

      {!hideNote && (
        <span id={noteId} style={noteStyle}>
          {status.summary}
          {status.issue ? (
            <>
              {' — '}
              <a
                href={`https://github.com/navigreen311/animaforge/issues/${status.issue}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-tertiary)', textDecoration: 'underline' }}
              >
                #{status.issue}
              </a>
            </>
          ) : null}
        </span>
      )}

      {/* The full reason, always available to assistive technology even when
          the visible note is suppressed for layout. */}
      {hideNote && (
        <span id={noteId} style={{ display: 'none' }}>
          {status.detail}
        </span>
      )}
    </span>
  );
}

/**
 * Block-level version for empty states and panels, where there is room to
 * explain properly rather than in a 260px note.
 */
export function UnavailableNotice({ feature, title }: { feature: FeatureKey; title?: string }) {
  const status = getFeatureStatus(feature);

  return (
    <div
      role="note"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        maxWidth: 520,
        background: 'var(--bg-secondary)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {title ?? status.summary}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--text-tertiary)',
        }}
      >
        {status.detail}
      </p>
      {status.issue ? (
        <p style={{ margin: '8px 0 0', fontSize: 12 }}>
          <a
            href={`https://github.com/navigreen311/animaforge/issues/${status.issue}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--brand)' }}
          >
            Tracked in issue #{status.issue}
          </a>
        </p>
      ) : null}
    </div>
  );
}
