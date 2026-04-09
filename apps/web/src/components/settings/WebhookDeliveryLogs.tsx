'use client';

import { useState } from 'react';
import { Check, X, Eye, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface DeliveryEntry {
  id: string;
  success: boolean;
  time: string;
  event: string;
  responseCode: number;
  duration: string;
  request: {
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  response: {
    headers: Record<string, string>;
    body: string;
  };
}

const MOCK_DELIVERIES: DeliveryEntry[] = [
  {
    id: 'del_1',
    success: true,
    time: '2026-04-09 14:32:01 UTC',
    event: 'job.complete',
    responseCode: 200,
    duration: '142ms',
    request: {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=abc123...' },
      body: { event: 'job.complete', jobId: 'job_8a2f', status: 'completed', timestamp: '2026-04-09T14:32:00Z' },
    },
    response: { headers: { 'Content-Type': 'application/json' }, body: '{"received": true}' },
  },
  {
    id: 'del_2',
    success: true,
    time: '2026-04-09 13:15:44 UTC',
    event: 'shot.approved',
    responseCode: 200,
    duration: '98ms',
    request: {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=def456...' },
      body: { event: 'shot.approved', shotId: 'shot_3c9d', approvedBy: 'user_42', timestamp: '2026-04-09T13:15:43Z' },
    },
    response: { headers: { 'Content-Type': 'application/json' }, body: '{"ok": true}' },
  },
  {
    id: 'del_3',
    success: false,
    time: '2026-04-09 11:02:19 UTC',
    event: 'job.complete',
    responseCode: 500,
    duration: '3012ms',
    request: {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=ghi789...' },
      body: { event: 'job.complete', jobId: 'job_1b4e', status: 'completed', timestamp: '2026-04-09T11:02:18Z' },
    },
    response: { headers: { 'Content-Type': 'text/plain' }, body: 'Internal Server Error' },
  },
  {
    id: 'del_4',
    success: true,
    time: '2026-04-08 22:45:33 UTC',
    event: 'job.complete',
    responseCode: 200,
    duration: '156ms',
    request: {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=jkl012...' },
      body: { event: 'job.complete', jobId: 'job_9d3a', status: 'completed', timestamp: '2026-04-08T22:45:32Z' },
    },
    response: { headers: { 'Content-Type': 'application/json' }, body: '{"received": true}' },
  },
  {
    id: 'del_5',
    success: false,
    time: '2026-04-08 18:11:07 UTC',
    event: 'shot.approved',
    responseCode: 0,
    duration: '30000ms',
    request: {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=mno345...' },
      body: { event: 'shot.approved', shotId: 'shot_7f2b', approvedBy: 'user_15', timestamp: '2026-04-08T18:11:06Z' },
    },
    response: { headers: {}, body: 'Connection timed out' },
  },
];

interface Props {
  webhookId: string;
}

export default function WebhookDeliveryLogs({ webhookId }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
        Delivery Logs
        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8, fontSize: 12 }}>
          ({webhookId})
        </span>
      </h3>

      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 120px 80px 80px 100px',
          gap: 8,
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span>Status</span>
        <span>Time</span>
        <span>Event</span>
        <span>Code</span>
        <span>Duration</span>
        <span>Actions</span>
      </div>

      {/* Rows */}
      {MOCK_DELIVERIES.map((entry) => (
        <div key={entry.id}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 120px 80px 80px 100px',
              gap: 8,
              padding: '10px 12px',
              fontSize: 13,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              background: expandedRow === entry.id ? 'var(--bg-overlay)' : 'transparent',
            }}
          >
            {/* Status icon */}
            <span>
              {entry.success ? (
                <Check size={14} style={{ color: '#34d399' }} />
              ) : (
                <X size={14} style={{ color: '#f87171' }} />
              )}
            </span>

            {/* Time */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {entry.time}
            </span>

            {/* Event */}
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--brand-dim)',
                color: 'var(--text-brand)',
                fontSize: 11,
                fontWeight: 500,
                display: 'inline-block',
                width: 'fit-content',
              }}
            >
              {entry.event}
            </span>

            {/* Response code */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: entry.success ? '#34d399' : '#f87171',
                fontWeight: 600,
              }}
            >
              {entry.responseCode || 'TIMEOUT'}
            </span>

            {/* Duration */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {entry.duration}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => toggleRow(entry.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {expandedRow === entry.id ? <ChevronDown size={10} /> : <Eye size={10} />}
                View
              </button>
              {!entry.success && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={10} />
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Expanded detail view */}
          {expandedRow === entry.id && (
            <div
              style={{
                padding: '16px 12px 16px 48px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-overlay)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
              }}
            >
              {/* Request */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Request
                </h4>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Headers</p>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-base)',
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {JSON.stringify(entry.request.headers, null, 2)}
                  </pre>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Body</p>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-base)',
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {JSON.stringify(entry.request.body, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Response */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Response
                </h4>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Headers</p>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-base)',
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {JSON.stringify(entry.response.headers, null, 2)}
                  </pre>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Body</p>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-base)',
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      color: entry.success ? 'var(--text-secondary)' : '#f87171',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {entry.response.body}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
