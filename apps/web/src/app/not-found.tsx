import Link from 'next/link';
import { FolderKanban, Film, Store, HelpCircle, Search, ArrowLeft } from 'lucide-react';

const quickLinks = [
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Timeline', href: '/timeline', icon: Film },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

export default function NotFound() {
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

      {/* 404 */}
      <h1
        style={{
          fontSize: 96,
          fontWeight: 700,
          color: 'var(--brand)',
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '12px 0 8px',
        }}
      >
        Page not found
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: 0,
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Back button */}
      <Link
        href="/"
        style={{
          marginTop: 28,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Search */}
      <div
        style={{
          marginTop: 32,
          width: '100%',
          maxWidth: 400,
          position: 'relative',
        }}
      >
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }}
        />
        <input
          type="text"
          placeholder="Search AnimaForge..."
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {/* Quick links */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
