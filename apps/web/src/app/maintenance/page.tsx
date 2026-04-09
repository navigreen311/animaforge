import { Wrench, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Maintenance | AnimaForge',
};

export default function MaintenancePage() {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
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

      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--brand-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Wrench size={28} style={{ color: 'var(--brand-light)' }} />
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        AnimaForge is undergoing scheduled maintenance
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
        We&apos;re performing upgrades to improve performance and reliability. We&apos;ll be back shortly.
      </p>

      {/* Estimated time */}
      <div
        style={{
          marginTop: 28,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
          Estimated completion
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
          Within the next 2 hours
        </div>
      </div>

      {/* Status link */}
      <a
        href="https://status.animaforge.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 24,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} />
        View status page
      </a>
    </div>
  );
}
