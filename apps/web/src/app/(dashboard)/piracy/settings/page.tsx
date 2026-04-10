'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  FileText,
  Bell,
  Settings as SettingsIcon,
  Ban,
  Check,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type ScanFrequency = 'hourly' | 'daily' | 'weekly';

interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
}

interface AllowlistEntry {
  id: string;
  value: string;
  label: string;
}

interface PiracySettings {
  autoScan: boolean;
  frequency: ScanFrequency;
  platforms: PlatformConfig[];
  matchThreshold: number;
  dmcaTemplate: string;
  allowlist: AllowlistEntry[];
  emailAlerts: boolean;
  slackWebhook: string;
}

// ══════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════

const DEFAULT_DMCA_TEMPLATE = `To Whom It May Concern,

I am writing to notify you of an infringement of my copyrighted work on your platform. The original work is available at [ORIGINAL_URL] and is verifiably mine through the C2PA manifest attached to the render.

The infringing material can be found at [MATCH_URL]. I have a good faith belief that the use of this material is not authorized by me, my agent, or the law.

I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner of the work in question.

Please remove the infringing material promptly.

Sincerely,
[YOUR_NAME]
[YOUR_CONTACT_INFO]`;

const DEFAULT_SETTINGS: PiracySettings = {
  autoScan: true,
  frequency: 'daily',
  platforms: [
    { id: 'youtube', name: 'YouTube', enabled: true },
    { id: 'tiktok', name: 'TikTok', enabled: true },
    { id: 'instagram', name: 'Instagram', enabled: true },
    { id: 'twitter', name: 'Twitter / X', enabled: true },
    { id: 'reddit', name: 'Reddit', enabled: false },
    { id: 'facebook', name: 'Facebook', enabled: false },
  ],
  matchThreshold: 80,
  dmcaTemplate: DEFAULT_DMCA_TEMPLATE,
  allowlist: [
    {
      id: 'a1',
      value: 'https://youtube.com/@officialstudio',
      label: 'Official studio channel',
    },
    {
      id: 'a2',
      value: '@partnerbrand',
      label: 'Licensed partner',
    },
  ],
  emailAlerts: true,
  slackWebhook: '',
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const pageStyle: React.CSSProperties = {
  padding: '24px 28px',
  color: 'var(--text-primary)',
  maxWidth: 900,
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 16,
  overflow: 'hidden',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  borderBottom: '0.5px solid var(--border)',
};

const sectionBodyStyle: React.CSSProperties = {
  padding: 16,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '0.5px solid var(--border)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-primary)',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  marginTop: 2,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#fff',
  border: 'none',
  padding: '9px 18px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

// ══════════════════════════════════════════════════════════════
// TOGGLE
// ══════════════════════════════════════════════════════════════

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        background: checked ? 'var(--brand)' : 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.18s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 1,
          left: checked ? 15 : 1,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.18s',
        }}
      />
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function PiracySettingsPage() {
  const [settings, setSettings] = useState<PiracySettings>(DEFAULT_SETTINGS);
  const [newAllowlistValue, setNewAllowlistValue] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const updatePlatform = (id: string, enabled: boolean) => {
    setSettings((s) => ({
      ...s,
      platforms: s.platforms.map((p) => (p.id === id ? { ...p, enabled } : p)),
    }));
  };

  const addAllowlistEntry = () => {
    const v = newAllowlistValue.trim();
    if (!v) return;
    setSettings((s) => ({
      ...s,
      allowlist: [
        ...s.allowlist,
        {
          id: `a${Date.now()}`,
          value: v,
          label: 'Manually added',
        },
      ],
    }));
    setNewAllowlistValue('');
  };

  const removeAllowlistEntry = (id: string) => {
    setSettings((s) => ({
      ...s,
      allowlist: s.allowlist.filter((e) => e.id !== id),
    }));
  };

  const resetTemplate = () => {
    setSettings((s) => ({ ...s, dmcaTemplate: DEFAULT_DMCA_TEMPLATE }));
  };

  const saveSettings = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div style={pageStyle}>
      {/* BACK LINK */}
      <Link
        href="/piracy"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={12} /> Back to piracy monitoring
      </Link>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 4px',
        }}
      >
        Piracy Settings
      </h1>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          margin: '0 0 20px',
        }}
      >
        Configure automated scanning, DMCA templates, allowlists, and alerts.
      </p>

      {/* SCAN CONFIGURATION */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <SettingsIcon size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Scan Configuration
          </div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Auto-scan</div>
              <div style={hintStyle}>
                Automatically monitor platforms for infringing content
              </div>
            </div>
            <Toggle
              checked={settings.autoScan}
              onChange={(v) => setSettings({ ...settings, autoScan: v })}
            />
          </div>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Scan frequency</div>
              <div style={hintStyle}>How often to run automated scans</div>
            </div>
            <select
              value={settings.frequency}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  frequency: e.target.value as ScanFrequency,
                })
              }
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div
            style={{
              padding: '14px 0 10px',
              borderBottom: '0.5px solid var(--border)',
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 2 }}>Platforms</div>
            <div style={{ ...hintStyle, marginBottom: 12 }}>
              Choose which platforms to monitor
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              {settings.platforms.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {p.name}
                  </span>
                  <Toggle
                    checked={p.enabled}
                    onChange={(v) => updatePlatform(p.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 0 4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 2,
              }}
            >
              <div style={labelStyle}>Match threshold</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--brand)',
                }}
              >
                {settings.matchThreshold}%
              </div>
            </div>
            <div style={{ ...hintStyle, marginBottom: 12 }}>
              Minimum similarity required to flag a match
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={settings.matchThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  matchThreshold: Number(e.target.value),
                })
              }
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                marginTop: 4,
              }}
            >
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* DMCA TEMPLATES */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <FileText size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            DMCA Templates
          </div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ ...hintStyle, marginBottom: 10 }}>
            This template pre-fills the good faith statement in the DMCA filing
            wizard. Use placeholders like [ORIGINAL_URL] and [MATCH_URL].
          </div>
          <textarea
            value={settings.dmcaTemplate}
            onChange={(e) =>
              setSettings({ ...settings, dmcaTemplate: e.target.value })
            }
            rows={10}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          />
          <div style={{ marginTop: 10 }}>
            <button style={ghostBtn} onClick={resetTemplate}>
              <RotateCcw size={12} /> Reset to default
            </button>
          </div>
        </div>
      </div>

      {/* ALLOWLIST */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Ban size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Allowlist
          </div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ ...hintStyle, marginBottom: 10 }}>
            URLs and users that will never trigger alerts
          </div>

          <div style={{ marginBottom: 12 }}>
            {settings.allowlist.length === 0 && (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                No allowlisted entries
              </div>
            )}
            {settings.allowlist.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 6,
                }}
              >
                <Check size={12} style={{ color: '#4ade80' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {entry.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {entry.label}
                  </div>
                </div>
                <button
                  onClick={() => removeAllowlistEntry(entry.id)}
                  aria-label="Remove"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="URL or @username"
              value={newAllowlistValue}
              onChange={(e) => setNewAllowlistValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addAllowlistEntry();
              }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button style={ghostBtn} onClick={addAllowlistEntry}>
              <Plus size={12} /> Add to allowlist
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Bell size={14} style={{ color: 'var(--brand)' }} />
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Notifications
          </div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Email alerts</div>
              <div style={hintStyle}>
                Receive an email whenever a new match is flagged
              </div>
            </div>
            <Toggle
              checked={settings.emailAlerts}
              onChange={(v) => setSettings({ ...settings, emailAlerts: v })}
            />
          </div>
          <div style={{ padding: '14px 0 0' }}>
            <div style={labelStyle}>Slack webhook URL</div>
            <div style={{ ...hintStyle, marginBottom: 8 }}>
              Optional. Send match notifications to a Slack channel.
            </div>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slackWebhook}
              onChange={(e) =>
                setSettings({ ...settings, slackWebhook: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* SAVE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 8,
        }}
      >
        <button style={primaryBtn} onClick={saveSettings}>
          <Shield size={14} /> Save settings
        </button>
        {savedFlash && (
          <span
            style={{
              fontSize: 11,
              color: '#4ade80',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Check size={12} /> Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
