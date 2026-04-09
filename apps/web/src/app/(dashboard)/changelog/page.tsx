'use client';

import { CHANGELOG_ENTRIES, ChangelogEntryCard } from '@/components/ui/ChangelogModal';

/* ------------------------------------------------------------------ */
/*  Full-page changelog                                                */
/* ------------------------------------------------------------------ */

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 32px' }}>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}
      >
        Changelog
      </h1>
      <p
        style={{
          margin: '0 0 32px',
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        All releases in reverse chronological order.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {CHANGELOG_ENTRIES.map((entry) => (
          <div
            key={entry.version}
            style={{
              paddingBottom: 28,
              borderBottom: '0.5px solid var(--border)',
            }}
          >
            <ChangelogEntryCard entry={entry} />
          </div>
        ))}
      </div>
    </div>
  );
}
