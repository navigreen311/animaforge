'use client';

import Link from 'next/link';
import { ChevronRight, Layers, Package } from 'lucide-react';
import BroadcastOverlayDesigner from '@/components/live/BroadcastOverlayDesigner';

const SAVED_SETS = [
  { id: 'set1', name: 'Gaming Stream', count: 4, updatedAt: '1h ago' },
  { id: 'set2', name: 'Talk Show', count: 6, updatedAt: '5h ago' },
  { id: 'set3', name: 'Charity Drive', count: 3, updatedAt: '2d ago' },
  { id: 'set4', name: 'Music Session', count: 5, updatedAt: '1w ago' },
];

export default function BroadcastOverlaysPage() {
  return (
    <div style={{ padding: 24, color: 'var(--fg, #e5e7eb)' }}>
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--muted, #9ca3af)',
          marginBottom: 8,
        }}
      >
        <Link href="/live" style={{ color: 'inherit', textDecoration: 'none' }}>
          Live
        </Link>
        <ChevronRight size={12} />
        <span>Overlays</span>
      </nav>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Layers size={22} />
        <h1 style={{ margin: 0, fontSize: 22 }}>Broadcast Overlays</h1>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 16,
        }}
      >
        <aside
          style={{
            background: 'var(--surface, #0b0b10)',
            border: '1px solid var(--border, #262631)',
            borderRadius: 12,
            padding: 12,
            alignSelf: 'start',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted, #9ca3af)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Saved overlay sets
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAVED_SETS.map((s) => (
              <li key={s.id}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--card, #14141b)',
                    border: '1px solid var(--border, #262631)',
                    color: 'var(--fg, #e5e7eb)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Package size={14} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted, #9ca3af)' }}>
                      {s.count} overlays | {s.updatedAt}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <BroadcastOverlayDesigner />
      </div>
    </div>
  );
}
