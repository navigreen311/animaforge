'use client';

import { useState } from 'react';

const MOCK_REFERRAL_CODE = 'AF-X7K9M2';
const REFERRAL_LINK = `https://animaforge.com/r/${MOCK_REFERRAL_CODE}`;

const MOCK_STATS = {
  referralsThisMonth: 3,
  creditsEarned: 600,
};

export default function ReferralSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = REFERRAL_LINK;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: 'var(--color-surface, #1a1a2e)',
        border: '1px solid var(--color-border, #2a2a4a)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: 'var(--spacing-lg, 24px)',
        maxWidth: 520,
      }}
    >
      <h3
        style={{
          margin: '0 0 4px 0',
          fontSize: 'var(--font-size-lg, 18px)',
          color: 'var(--color-text-primary, #ffffff)',
        }}
      >
        Refer friends, earn credits
      </h3>
      <p
        style={{
          margin: '0 0 20px 0',
          fontSize: 'var(--font-size-sm, 14px)',
          color: 'var(--color-text-secondary, #a0a0b8)',
        }}
      >
        You + your friend each get <strong>200 free credits</strong> when they
        sign up with your link.
      </p>

      {/* Referral link */}
      <label
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 'var(--font-size-xs, 12px)',
          color: 'var(--color-text-secondary, #a0a0b8)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Your referral link
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          readOnly
          value={REFERRAL_LINK}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--color-input-bg, #12121f)',
            border: '1px solid var(--color-border, #2a2a4a)',
            borderRadius: 'var(--radius-md, 8px)',
            color: 'var(--color-text-primary, #ffffff)',
            fontSize: 'var(--font-size-sm, 14px)',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            background: copied
              ? 'var(--color-success, #22c55e)'
              : 'var(--color-primary, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm, 14px)',
            fontWeight: 600,
            transition: 'background 0.2s',
            minWidth: 72,
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            flex: 1,
            padding: 'var(--spacing-md, 16px)',
            background: 'var(--color-input-bg, #12121f)',
            borderRadius: 'var(--radius-md, 8px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-2xl, 28px)',
              fontWeight: 700,
              color: 'var(--color-primary, #6366f1)',
            }}
          >
            {MOCK_STATS.referralsThisMonth}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-xs, 12px)',
              color: 'var(--color-text-secondary, #a0a0b8)',
              marginTop: 4,
            }}
          >
            Referrals this month
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: 'var(--spacing-md, 16px)',
            background: 'var(--color-input-bg, #12121f)',
            borderRadius: 'var(--radius-md, 8px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-2xl, 28px)',
              fontWeight: 700,
              color: 'var(--color-success, #22c55e)',
            }}
          >
            {MOCK_STATS.creditsEarned}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-xs, 12px)',
              color: 'var(--color-text-secondary, #a0a0b8)',
              marginTop: 4,
            }}
          >
            Credits earned
          </div>
        </div>
      </div>
    </div>
  );
}
