'use client';

import { useState } from 'react';
import { Plus, TestTube, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import WebhookDeliveryLogs from '@/components/settings/WebhookDeliveryLogs';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

const MOCK_WEBHOOKS: Webhook[] = [
  { id: 'wh_1', url: 'https://hooks.myapp.com/animaforge/production', events: ['job.complete', 'shot.approved'], active: true },
  { id: 'wh_2', url: 'https://api.internal.team/webhooks/animaforge-staging', events: ['job.complete'], active: true },
  { id: 'wh_3', url: 'https://discord.com/api/webhooks/1234567890/abcdef', events: ['shot.approved'], active: false },
];

function truncateUrl(url: string, max = 48): string {
  return url.length > max ? url.slice(0, max) + '...' : url;
}

export default function WebhooksPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Webhooks</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage webhook endpoints and review delivery logs.</p>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--brand)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Add webhook
        </button>
      </div>

      {/* Webhook list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK_WEBHOOKS.map((wh) => (
          <div
            key={wh.id}
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              overflow: 'hidden',
            }}
          >
            {/* Webhook row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                cursor: 'pointer',
              }}
              onClick={() => toggle(wh.id)}
            >
              {expandedId === wh.id ? <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />}

              {/* Status dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: wh.active ? '#34d399' : 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              />

              {/* URL */}
              <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', flex: 1 }}>
                {truncateUrl(wh.url)}
              </code>

              {/* Events */}
              <div style={{ display: 'flex', gap: 6 }}>
                {wh.events.map((ev) => (
                  <span
                    key={ev}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--brand-dim)',
                      color: 'var(--text-brand)',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {ev}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <TestTube size={12} /> Test
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: '#f87171',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {/* Delivery logs (expanded) */}
            {expandedId === wh.id && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-elevated)' }}>
                <WebhookDeliveryLogs webhookId={wh.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
