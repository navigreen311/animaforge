'use client';

import Link from 'next/link';
import { ChevronRight, GitBranch, FileText } from 'lucide-react';
import BranchingNarrativeEditor from '@/components/live/BranchingNarrativeEditor';

const SAVED_NARRATIVES = [
  { id: 'n1', name: 'Midnight Mystery', scenes: 8, updatedAt: '2h ago' },
  { id: 'n2', name: 'Cooking Show Pilot', scenes: 5, updatedAt: '1d ago' },
  { id: 'n3', name: 'Interactive Q&A', scenes: 12, updatedAt: '3d ago' },
  { id: 'n4', name: 'Choose Your Ending', scenes: 6, updatedAt: '1w ago' },
];

export default function BranchingNarrativesPage() {
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
        <span>Branching</span>
      </nav>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <GitBranch size={22} />
        <h1 style={{ margin: 0, fontSize: 22 }}>Branching Narratives</h1>
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
            Saved narratives
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAVED_NARRATIVES.map((n) => (
              <li key={n.id}>
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
                  <FileText size={14} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{n.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted, #9ca3af)' }}>
                      {n.scenes} scenes | {n.updatedAt}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <BranchingNarrativeEditor />
      </div>
    </div>
  );
}
