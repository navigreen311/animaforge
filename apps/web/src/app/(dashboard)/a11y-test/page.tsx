'use client';

/**
 * AnimaForge — Accessibility Test Page
 *
 * Demonstrates the accessibility utilities available in the codebase:
 *  - AccessibleModal (focus trap + escape close)
 *  - announce() for manual screen reader updates
 *  - VisuallyHidden for icon-button labels
 *  - Skip-to-content target (set on the dashboard layout)
 */

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { AccessibleModal } from '@/components/ui/AccessibleModal';
import VisuallyHidden from '@/components/ui/VisuallyHidden';
import { announce } from '@/lib/a11y/announcer';

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const h2Style: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const pStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: '0.5px solid var(--brand)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const iconButtonStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 8,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
};

export default function A11yTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState('');
  const [count, setCount] = useState(0);

  function handleAnnounce() {
    const next = count + 1;
    setCount(next);
    const msg = `Test announcement ${next}: operation completed successfully.`;
    announce(msg);
    setLastAnnouncement(msg);
  }

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
        Accessibility Test Page
      </h1>
      <p
        style={{
          margin: '0 0 32px',
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        Interactive demo of the accessibility utilities used throughout AnimaForge.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section 1: AccessibleModal */}
        <section style={sectionStyle} aria-labelledby="section-modal">
          <h2 id="section-modal" style={h2Style}>
            1. AccessibleModal — focus trap + escape close
          </h2>
          <p style={pStyle}>
            Opens a modal that traps Tab focus inside it and closes on Escape. Try
            tabbing through the fields — focus will cycle inside the dialog.
          </p>
          <button type="button" style={buttonStyle} onClick={() => setModalOpen(true)}>
            Open modal
          </button>

          <AccessibleModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Accessible Modal Demo"
          >
            <p style={{ ...pStyle, margin: '8px 0 12px' }}>
              Press <kbd>Tab</kbd> to cycle through the buttons below. Press{' '}
              <kbd>Esc</kbd> or click the backdrop to close.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{ ...buttonStyle, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => {
                  announce('Modal confirmed');
                  setModalOpen(false);
                }}
              >
                Confirm
              </button>
            </div>
          </AccessibleModal>
        </section>

        {/* Section 2: announce() */}
        <section style={sectionStyle} aria-labelledby="section-announce">
          <h2 id="section-announce" style={h2Style}>
            2. announce() — screen reader live region
          </h2>
          <p style={pStyle}>
            Pushes a polite status message to the shared aria-live region. Screen
            readers will read the message; the visible text below mirrors it.
          </p>
          <button type="button" style={buttonStyle} onClick={handleAnnounce}>
            Trigger announcement
          </button>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              fontFamily: 'monospace',
              padding: '6px 10px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              border: '0.5px solid var(--border)',
            }}
          >
            Last announced: {lastAnnouncement || '(none yet)'}
          </div>
        </section>

        {/* Section 3: VisuallyHidden */}
        <section style={sectionStyle} aria-labelledby="section-hidden">
          <h2 id="section-hidden" style={h2Style}>
            3. VisuallyHidden — icon-only buttons
          </h2>
          <p style={pStyle}>
            The bell button below has no visible text, but uses a VisuallyHidden span
            so screen readers announce &ldquo;Notifications&rdquo;.
          </p>
          <button
            type="button"
            style={iconButtonStyle}
            onClick={() => announce('Notifications opened')}
          >
            <Bell size={16} aria-hidden="true" />
            <VisuallyHidden>Notifications</VisuallyHidden>
          </button>
        </section>

        {/* Section 4: Skip-to-content */}
        <section style={sectionStyle} aria-labelledby="section-skip">
          <h2 id="section-skip" style={h2Style}>
            4. Skip-to-content link
          </h2>
          <p style={pStyle}>
            Reload this page and press <kbd>Tab</kbd> before clicking anywhere. The
            first focusable element is the &ldquo;Skip to content&rdquo; link rendered
            by the dashboard layout. Activating it jumps focus past the nav straight
            to the main content area.
          </p>
        </section>
      </div>
    </div>
  );
}
