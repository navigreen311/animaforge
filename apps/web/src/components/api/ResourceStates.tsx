'use client';

import type { ReactNode } from 'react';
import type { ApiErrorShape } from '@/lib/api/useResource';

/**
 * The loading / error / empty states every wired page renders.
 *
 * Shared so the distinction that matters is made once: an error is shown as an
 * error, never as an empty list. `NOT_IMPLEMENTED` gets its own treatment
 * because "this is not built yet" is a different message to the user than
 * "something went wrong".
 */

const box: React.CSSProperties = {
  padding: '32px 24px',
  borderRadius: 10,
  border: '1px solid var(--border, rgba(255,255,255,0.07))',
  background: 'var(--bg-elevated, #13131f)',
  textAlign: 'center',
};

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ ...box, color: 'var(--text-tertiary, rgba(226,232,240,0.4))', fontSize: 13 }}>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          marginRight: 8,
          borderRadius: '50%',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          verticalAlign: '-2px',
          animation: 'af-spin 0.8s linear infinite',
        }}
      />
      {label}
      <style>{'@keyframes af-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiErrorShape; onRetry?: () => void }) {
  const notImplemented = error.code === 'NOT_IMPLEMENTED';
  const unauthenticated = error.code === 'UNAUTHENTICATED';
  const tone = notImplemented ? '#fbbf24' : '#f87171';

  return (
    <div
      style={{
        ...box,
        borderColor: notImplemented ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)',
        background: notImplemented ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)',
      }}
      role="alert"
    >
      <div style={{ color: tone, fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {notImplemented
          ? 'Not available yet'
          : unauthenticated
            ? 'Sign in to see this'
            : 'Could not load this'}
      </div>
      <p
        style={{
          margin: '0 auto',
          maxWidth: 480,
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-secondary, rgba(226,232,240,0.6))',
        }}
      >
        {error.message}
      </p>
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 11,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-tertiary, rgba(226,232,240,0.35))',
        }}
      >
        {error.code}
      </p>
      {onRetry && !notImplemented && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 14,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--text-primary, #e2e8f0)',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={box}>
      <div
        style={{
          color: 'var(--text-primary, #e2e8f0)',
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {hint && (
        <p
          style={{
            margin: '0 auto',
            maxWidth: 420,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-tertiary, rgba(226,232,240,0.4))',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Render the right state for a resource, or the children when data has arrived.
 *
 * `isEmpty` is passed in rather than guessed: only the page knows whether an
 * empty array or a zero count counts as "nothing yet".
 */
export function ResourceView<T>({
  state,
  isEmpty,
  emptyTitle,
  emptyHint,
  loadingLabel,
  children,
}: {
  state: { data: T | null; error: ApiErrorShape | null; loading: boolean; reload: () => void };
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (state.loading) return <LoadingState label={loadingLabel} />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.data === null) {
    return <EmptyState title={emptyTitle ?? 'Nothing to show'} hint={emptyHint} />;
  }
  if (isEmpty?.(state.data)) {
    return <EmptyState title={emptyTitle ?? 'Nothing here yet'} hint={emptyHint} />;
  }
  return <>{children(state.data)}</>;
}
