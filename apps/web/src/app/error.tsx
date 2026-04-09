'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, Mail } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: Send to Sentry or external error tracking
    console.error('[AnimaForge] Unhandled error:', error);
  }, [error]);

  const digest = error.digest ?? 'unknown';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: 24,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          A
        </div>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>AnimaForge</span>
      </div>

      {/* Error heading */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: 'var(--brand)',
          margin: 0,
          lineHeight: 1,
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '12px 0 0',
          textAlign: 'center',
          maxWidth: 440,
          lineHeight: 1.6,
        }}
      >
        We hit an unexpected error. Our team has been notified. You can try again or head back to the dashboard.
      </p>

      {/* Error digest */}
      <div
        style={{
          marginTop: 20,
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Error ID: {digest}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Try again
        </button>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <Home size={16} />
          Go to dashboard
        </Link>

        <a
          href={`mailto:support@animaforge.com?subject=Error+${encodeURIComponent(digest)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <Mail size={16} />
          Contact support
        </a>
      </div>
    </div>
  );
}
