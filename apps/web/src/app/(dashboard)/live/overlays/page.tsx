'use client';

import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import BroadcastOverlayDesigner from '@/components/live/BroadcastOverlayDesigner';

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
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {/* Saved overlay sets listed four fixtures here. Nothing persists
                an overlay or a set of them: the designer beside this list keeps
                its layers in component state and there is no table to save them
                to, so there is no list to render. */}
            <li style={{ fontSize: 12, color: 'var(--muted, #9ca3af)', lineHeight: 1.5 }}>
              Saving overlay sets is not available yet — nothing in the schema stores an overlay.
            </li>
          </ul>
        </aside>

        <BroadcastOverlayDesigner />
      </div>
    </div>
  );
}
