'use client';

import { Smartphone, Monitor, Apple, Download, Check } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 48, marginBottom: 12, fontWeight: 700 }}>AnimaForge anywhere</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Native apps for desktop and mobile. Same powerful AI, optimized for every screen.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 64 }}>
          {/* Desktop */}
          <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Monitor size={28} color="var(--brand-light)" />
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 8 }}>Desktop App</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Mac, Windows, and Linux. Local cache, offline mode, native file access.</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
              {['Local proxy cache', 'Offline review mode', 'Native file pickers', 'Auto-updates', 'Background renders'].map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <Check size={14} color="var(--brand-light)" /> {f}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btnStyle}><Apple size={14} /> Mac (Universal)</button>
              <button style={btnStyle}><Download size={14} /> Windows</button>
              <button style={btnStyle}><Download size={14} /> Linux</button>
            </div>
          </div>

          {/* Mobile */}
          <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Smartphone size={28} color="var(--brand-light)" />
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 8 }}>Mobile App</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>iOS and Android. Review on the go, push notifications, quick capture.</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
              {['Approve shots from anywhere', 'Push notifications for renders', 'Camera reference capture', 'Render queue tracking', 'Team activity feed'].map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <Check size={14} color="var(--brand-light)" /> {f}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btnStyle}><Apple size={14} /> App Store</button>
              <button style={btnStyle}><Download size={14} /> Google Play</button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Already have an account?</p>
          <a href="/login" style={{ color: 'var(--brand-light)', textDecoration: 'none', fontWeight: 500 }}>Sign in to AnimaForge →</a>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
  background: 'var(--brand)', color: '#fff', border: 'none',
  borderRadius: 'var(--radius-md)', fontSize: 12, cursor: 'pointer',
};
