'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Shield, BarChart3, Megaphone } from 'lucide-react';

const STORAGE_KEY = 'af-cookie-consent';

interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

function getStoredConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

function saveConsent(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 'var(--radius-pill)',
        background: checked ? 'var(--brand)' : 'var(--border-strong)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings modal                                                     */
/* ------------------------------------------------------------------ */
function SettingsModal({
  analytics,
  marketing,
  onAnalyticsChange,
  onMarketingChange,
  onSave,
  onClose,
}: {
  analytics: boolean;
  marketing: boolean;
  onAnalyticsChange: (v: boolean) => void;
  onMarketingChange: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const categories = [
    {
      icon: <Shield size={18} />,
      label: 'Essential',
      description: 'Required for the site to function. Cannot be disabled.',
      checked: true,
      onChange: () => {},
      disabled: true,
    },
    {
      icon: <BarChart3 size={18} />,
      label: 'Analytics',
      description: 'Help us understand how you use AnimaForge so we can improve.',
      checked: analytics,
      onChange: onAnalyticsChange,
      disabled: false,
    },
    {
      icon: <Megaphone size={18} />,
      label: 'Marketing',
      description: 'Allow personalized content and relevant promotions.',
      checked: marketing,
      onChange: onMarketingChange,
      disabled: false,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 460,
          margin: '0 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Cookie Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map((cat) => (
            <div
              key={cat.label}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--brand-light)', marginTop: 2 }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{cat.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{cat.description}</div>
              </div>
              <Toggle checked={cat.checked} onChange={cat.onChange} disabled={cat.disabled} />
            </div>
          ))}
        </div>

        <button
          onClick={onSave}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save preferences
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main banner                                                        */
/* ------------------------------------------------------------------ */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback((prefs: CookiePreferences) => {
    saveConsent(prefs);
    setVisible(false);
    setShowSettings(false);
  }, []);

  const handleAcceptAll = () => dismiss({ essential: true, analytics: true, marketing: true });
  const handleRejectAll = () => dismiss({ essential: true, analytics: false, marketing: false });
  const handleSavePreferences = () => dismiss({ essential: true, analytics, marketing });

  if (!visible) return null;

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            analytics={analytics}
            marketing={marketing}
            onAnalyticsChange={setAnalytics}
            onMarketingChange={setMarketing}
            onSave={handleSavePreferences}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          padding: '16px 24px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
          <Cookie size={20} style={{ color: 'var(--brand-light)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            We use cookies to provide our service, analyze usage, and improve AnimaForge.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              ...btnBase,
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            Cookie settings
          </button>
          <button
            onClick={handleRejectAll}
            style={{
              ...btnBase,
              background: 'var(--bg-overlay)',
              color: 'var(--text-primary)',
            }}
          >
            Reject all
          </button>
          <button
            onClick={handleAcceptAll}
            style={{
              ...btnBase,
              background: 'var(--brand)',
              color: '#fff',
            }}
          >
            Accept all
          </button>
        </div>
      </motion.div>
    </>
  );
}
