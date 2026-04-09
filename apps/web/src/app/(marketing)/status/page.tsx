'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Mail } from 'lucide-react';

const SERVICES = [
  { name: 'API Gateway', status: 'Operational' },
  { name: 'Video Generation', status: 'Operational' },
  { name: 'Avatar Studio', status: 'Operational' },
  { name: 'Audio Generation', status: 'Operational' },
  { name: 'Asset Storage', status: 'Operational' },
  { name: 'Marketplace', status: 'Operational' },
  { name: 'Email Delivery', status: 'Operational' },
] as const;

const INCIDENTS = [
  {
    date: 'April 2, 2026',
    title: 'Elevated latency on Video Generation',
    description: 'Video generation jobs experienced 2-3x longer queue times between 14:00-15:30 UTC. Root cause: autoscaling delay on GPU pool. Resolved by increasing minimum replica count.',
    resolved: true,
  },
  {
    date: 'March 18, 2026',
    title: 'Intermittent 502 errors on API Gateway',
    description: 'A rolling deployment caused brief 502 responses for ~4 minutes. Deployment strategy updated to blue-green to prevent recurrence.',
    resolved: true,
  },
];

const UPTIME = [
  { service: 'API', uptime: '99.95%' },
  { service: 'Generation', uptime: '99.7%' },
  { service: 'Storage', uptime: '99.99%' },
];

export default function StatusPage() {
  const [email, setEmail] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>All systems operational</h1>
        </div>

        {/* Service table */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Services</h2>
          <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {SERVICES.map((svc, i) => (
              <div
                key={svc.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  borderBottom: i < SERVICES.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: 13, fontWeight: 500 }}>
                  <CheckCircle size={14} />
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Uptime */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Uptime (30 days)</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            {UPTIME.map((u) => (
              <div
                key={u.service}
                style={{
                  flex: 1,
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 28, fontWeight: 600, color: '#34d399', marginBottom: 4 }}>{u.uptime}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.service}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Incident history */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Incident History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {INCIDENTS.map((inc, i) => (
              <div
                key={i}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inc.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#34d399' }}>
                    <CheckCircle size={12} />
                    Resolved
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{inc.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{inc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Subscribe */}
        <section
          style={{
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            textAlign: 'center',
          }}
        >
          <Mail size={24} style={{ color: 'var(--brand-light)', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Subscribe to updates</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Get notified when we have maintenance windows or incidents.
          </p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto' }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--brand)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Subscribe
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
