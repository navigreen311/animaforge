'use client';

import { useEffect, useState } from 'react';
import { Globe, Zap, Shield } from 'lucide-react';
import { REGIONS, pingRegion, getStoredRegion, setStoredRegion } from '@/lib/region/regions';
import { toast } from 'sonner';

export default function RegionSettingsPage() {
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [currentId, setCurrentId] = useState<string>('us-east-1');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const stored = getStoredRegion();
    if (stored) setCurrentId(stored);
    runTests();
  }, []);

  const runTests = async () => {
    setTesting(true);
    const next: Record<string, number> = {};
    for (const r of REGIONS) {
      next[r.id] = await pingRegion(r);
    }
    setLatencies(next);
    setTesting(false);
  };

  const handleSwitch = (id: string) => {
    setCurrentId(id);
    setStoredRegion(id);
    toast.success(`Switched to ${REGIONS.find((r) => r.id === id)?.name}`);
  };

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, marginBottom: 4 }}>Region & Performance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          AnimaForge runs in 6 regions worldwide. Lower latency means faster generation.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={runTests} disabled={testing} style={{
          padding: '10px 16px', background: 'var(--brand)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Zap size={14} /> {testing ? 'Testing...' : 'Test all regions'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
            {['Flag', 'Region', 'City', 'Latency', 'Status', ''].map((h) => (
              <th key={h} style={{ padding: 12, textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REGIONS.map((r) => {
            const ms = latencies[r.id];
            const color = ms == null ? 'var(--text-tertiary)' : ms < 100 ? '#10b981' : ms < 200 ? '#eab308' : '#ef4444';
            const isCurrent = r.id === currentId;
            return (
              <tr key={r.id} style={{ borderBottom: '0.5px solid var(--border)', background: isCurrent ? 'var(--bg-active)' : 'transparent' }}>
                <td style={{ padding: 12, fontSize: 18 }}>{r.flag}</td>
                <td style={{ padding: 12, color: 'var(--text-primary)', fontSize: 13 }}>{r.name}</td>
                <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 12 }}>{r.city}, {r.country}</td>
                <td style={{ padding: 12, color, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{ms != null ? `${ms}ms` : '—'}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{r.status}</span>
                </td>
                <td style={{ padding: 12 }}>
                  {!isCurrent && (
                    <button onClick={() => handleSwitch(r.id)} style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>
                      Switch
                    </button>
                  )}
                  {isCurrent && <span style={{ fontSize: 11, color: 'var(--brand)' }}>● Current</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={16} color="var(--brand)" />
          <h3 style={{ color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Data Residency & Compliance</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          EU regions (Ireland, Frankfurt) keep data within the EU for GDPR compliance.
          All regions are SOC 2 Type II and ISO 27001 certified.
        </p>
      </div>
    </div>
  );
}
