'use client';

import { useEffect, useState } from 'react';
import { Globe, Zap, Check } from 'lucide-react';
import { REGIONS, Region, pingRegion, getStoredRegion, setStoredRegion, detectFastestRegion } from '@/lib/region/regions';

export default function RegionSelector({ onChange }: { onChange?: (regionId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string>('us-east-1');
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const stored = getStoredRegion();
    if (stored) setCurrentId(stored);
    REGIONS.forEach(async (r) => {
      const ms = await pingRegion(r);
      setLatencies((prev) => ({ ...prev, [r.id]: ms }));
    });
  }, []);

  const handleSelect = (id: string) => {
    setCurrentId(id);
    setStoredRegion(id);
    onChange?.(id);
    setOpen(false);
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    const sorted = await detectFastestRegion();
    const next: Record<string, number> = {};
    sorted.forEach((s) => (next[s.region.id] = s.latency));
    setLatencies(next);
    handleSelect(sorted[0].region.id);
    setDetecting(false);
  };

  const current = REGIONS.find((r) => r.id === currentId);
  const fastestId = Object.entries(latencies).sort(([, a], [, b]) => a - b)[0]?.[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Select region"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)',
          background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
        }}
      >
        <Globe size={13} />
        <span>{current?.flag} {current?.id}</span>
        {latencies[currentId] != null && <span style={{ color: 'var(--text-tertiary)' }}>· {latencies[currentId]}ms</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 100,
          background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
          minWidth: 320, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            style={{
              width: '100%', padding: '8px 12px', marginBottom: 6, borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-dim)', color: 'var(--text-brand)', border: '0.5px solid var(--border-brand)',
              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}
          >
            <Zap size={12} />
            {detecting ? 'Testing...' : 'Auto-detect fastest'}
          </button>
          {REGIONS.map((r) => {
            const ms = latencies[r.id];
            const isCurrent = r.id === currentId;
            const isFastest = r.id === fastestId;
            const color = ms == null ? 'var(--text-tertiary)' : ms < 100 ? '#10b981' : ms < 200 ? '#eab308' : '#ef4444';
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: isCurrent ? 'var(--bg-active)' : 'transparent',
                  border: 'none', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16 }}>{r.flag}</span>
                <span style={{ flex: 1 }}>{r.name}</span>
                {isFastest && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'var(--brand-dim)', color: 'var(--text-brand)' }}>Best</span>}
                <span style={{ color, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{ms != null ? `${ms}ms` : '...'}</span>
                {isCurrent && <Check size={12} color="var(--brand)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
