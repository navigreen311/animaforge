'use client';

import { useState } from 'react';
import { Settings, User, CreditCard, Key, Trash2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────
type Tab = 'profile' | 'workspace' | 'billing' | 'api-keys';
type Theme = 'dark' | 'light';
type RenderQuality = 'preview' | 'standard' | 'final';

interface TabDef {
  label: string;
  value: Tab;
  icon: React.ReactNode;
}

// ── Tab Config ───────────────────────────────────────────────────
const TABS: TabDef[] = [
  { label: 'Profile', value: 'profile', icon: <User size={13} /> },
  { label: 'Workspace', value: 'workspace', icon: <Settings size={13} /> },
  { label: 'Billing', value: 'billing', icon: <CreditCard size={13} /> },
  { label: 'API Keys', value: 'api-keys', icon: <Key size={13} /> },
];

// ── Shared Styles ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-tertiary)',
  margin: '0 0 6px',
  fontWeight: 500,
};

// ── Component ────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState('Shadow');
  const [email, setEmail] = useState('shadow@animaforge.io');

  // Preferences state
  const [theme, setTheme] = useState<Theme>('dark');
  const [language] = useState('en');
  const [renderQuality, setRenderQuality] = useState<RenderQuality>('standard');
  const [emailNotifications, setEmailNotifications] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '4px 0 0',
            }}
          >
            Manage your account, preferences, and integrations
          </p>
        </div>

        {/* ── Tab Navigation ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              style={{
                background:
                  activeTab === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color:
                  activeTab === tab.value
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                border:
                  activeTab === tab.value
                    ? '0.5px solid var(--border)'
                    : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeTab === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: 560 }}>
            {/* ── Profile Section ──────────────────────────── */}
            <div style={cardStyle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                Profile
              </h2>

              {/* Avatar + Name row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  SH
                </div>
                <div style={{ flex: 1 }}>
                  <p style={labelStyle}>Display Name</p>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-brand)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Email</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-brand)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                />
              </div>

              {/* Save button */}
              <button
                type="button"
                style={{
                  background: 'var(--brand)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                }}
              >
                Save
              </button>
            </div>

            {/* ── Preferences Section ─────────────────────── */}
            <div style={cardStyle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                Preferences
              </h2>

              {/* Theme toggle */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Theme</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['dark', 'light'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      style={{
                        background:
                          theme === t ? 'var(--bg-surface)' : 'transparent',
                        color:
                          theme === t
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                        border:
                          theme === t
                            ? '0.5px solid var(--border-brand)'
                            : '0.5px solid var(--border)',
                        padding: '5px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontWeight: theme === t ? 500 : 400,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language dropdown */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Language</p>
                <select
                  value={language}
                  style={{
                    ...inputStyle,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: 32,
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-brand)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              {/* Default Render Quality */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Default Render Quality</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['preview', 'standard', 'final'] as RenderQuality[]).map(
                    (q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setRenderQuality(q)}
                        style={{
                          background:
                            renderQuality === q
                              ? 'var(--bg-surface)'
                              : 'transparent',
                          color:
                            renderQuality === q
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
                          border:
                            renderQuality === q
                              ? '0.5px solid var(--border-brand)'
                              : '0.5px solid var(--border)',
                          padding: '5px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 12,
                          fontWeight: renderQuality === q ? 500 : 400,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          textTransform: 'capitalize',
                        }}
                      >
                        {q}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Email notifications toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ ...labelStyle, margin: 0 }}>
                    Email Notifications
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Receive updates about renders, team activity, and billing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    border: 'none',
                    background: emailNotifications
                      ? 'var(--brand)'
                      : 'var(--bg-hover)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 150ms ease',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: 3,
                      left: emailNotifications ? 19 : 3,
                      transition: 'left 150ms ease',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* ── Danger Zone ─────────────────────────────── */}
            <div
              style={{
                ...cardStyle,
                border: '0.5px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.05)',
                marginBottom: 0,
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ef4444',
                  margin: '0 0 12px',
                }}
              >
                Danger Zone
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px',
                  lineHeight: 1.5,
                }}
              >
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  color: '#ef4444',
                  border: '0.5px solid rgba(239,68,68,0.5)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={13} />
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'workspace' && (
          <div style={{ maxWidth: 560 }}>
            <div style={cardStyle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                Workspace
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                }}
              >
                Workspace settings coming soon.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div style={{ maxWidth: 560 }}>
            <div style={cardStyle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                Billing
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                }}
              >
                Billing management coming soon.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div style={{ maxWidth: 560 }}>
            <div style={cardStyle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                API Keys
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                }}
              >
                API key management coming soon.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
