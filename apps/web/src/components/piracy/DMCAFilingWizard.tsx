'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Copy,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface DMCAMatchData {
  id: string;
  originalTitle: string;
  originalProject: string;
  originalDuration: string;
  c2paVerified: boolean;
  watermarkDetected: boolean;
  matchUrl: string;
  platform: string;
  matchStrength: number;
  uploader?: string;
}

interface DMCAFilingWizardProps {
  open: boolean;
  onClose: () => void;
  match?: DMCAMatchData;
  onSubmit?: (payload: DMCAFormState) => void;
}

interface DMCAFormState {
  fullName: string;
  address: string;
  phone: string;
  goodFaithStatement: string;
  penaltyAcknowledged: boolean;
  signature: string;
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════

const DEFAULT_MATCH: DMCAMatchData = {
  id: 'M-20431',
  originalTitle: 'Cyber Samurai — Opening Scene',
  originalProject: 'Cyber Samurai',
  originalDuration: '00:42',
  c2paVerified: true,
  watermarkDetected: true,
  matchUrl: 'https://www.youtube.com/watch?v=aB9xK2pLmNq',
  platform: 'YouTube',
  matchStrength: 92,
  uploader: '@anonreupload',
};

const DEFAULT_GOOD_FAITH =
  'I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.';

const MOCK_USER: DMCAFormState = {
  fullName: 'Alex Morgan',
  address: '123 Studio Lane, Los Angeles, CA 90028',
  phone: '+1 (555) 012-3456',
  goodFaithStatement: DEFAULT_GOOD_FAITH,
  penaltyAcknowledged: false,
  signature: '',
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  width: '100%',
  maxWidth: 640,
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  borderBottom: '0.5px solid var(--border)',
};

const bodyStyle: React.CSSProperties = {
  padding: 20,
  overflowY: 'auto',
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  borderTop: '0.5px solid var(--border)',
  background: 'var(--bg-surface)',
};

const primaryBtn: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
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
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 500,
  marginBottom: 6,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 600,
  background: 'rgba(34, 197, 94, 0.12)',
  color: '#4ade80',
  border: '0.5px solid rgba(34,197,94,0.3)',
};

// ══════════════════════════════════════════════════════════════
// STEP INDICATOR
// ══════════════════════════════════════════════════════════════

const STEPS = [
  { id: 1, label: 'Verify Ownership' },
  { id: 2, label: 'Match Details' },
  { id: 3, label: 'File Notice' },
  { id: 4, label: 'Review & Submit' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {STEPS.map((step, idx) => {
        const active = step.id === current;
        const done = step.id < current;
        return (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  background: done
                    ? 'var(--brand)'
                    : active
                    ? 'var(--brand)'
                    : 'var(--bg-surface)',
                  color: done || active ? '#fff' : 'var(--text-tertiary)',
                  border:
                    done || active
                      ? 'none'
                      : '0.5px solid var(--border)',
                }}
              >
                {done ? <Check size={12} /> : step.id}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  width: 16,
                  height: 1,
                  background: 'var(--border)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function DMCAFilingWizard({
  open,
  onClose,
  match = DEFAULT_MATCH,
  onSubmit,
}: DMCAFilingWizardProps) {
  const [step, setStep] = useState(1);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [form, setForm] = useState<DMCAFormState>(MOCK_USER);
  const [submitted, setSubmitted] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setOwnershipConfirmed(false);
    setForm(MOCK_USER);
    setSubmitted(false);
    setCaseNumber(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const canContinue = () => {
    if (step === 1) return ownershipConfirmed;
    if (step === 3)
      return (
        form.fullName.trim().length > 0 &&
        form.address.trim().length > 0 &&
        form.penaltyAcknowledged &&
        form.signature.trim().length > 0
      );
    return true;
  };

  const handleSubmit = () => {
    const id = `DMCA-${Math.floor(Math.random() * 900000 + 100000)}`;
    setCaseNumber(id);
    setSubmitted(true);
    onSubmit?.(form);
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="File DMCA takedown">
      <motion.div
        style={modalStyle}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        {/* HEADER */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={16} style={{ color: 'var(--brand)' }} />
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              File DMCA Takedown Notice
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* STEPS BAR */}
        {!submitted && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '0.5px solid var(--border)',
              overflowX: 'auto',
            }}
          >
            <StepIndicator current={step} />
          </div>
        )}

        {/* BODY */}
        <div style={bodyStyle}>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.12)',
                    border: '0.5px solid rgba(34,197,94,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle2 size={28} style={{ color: '#4ade80' }} />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 6px',
                  }}
                >
                  DMCA Notice Filed
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 18px',
                  }}
                >
                  Your takedown request has been submitted to {match.platform}.
                </p>
                <div
                  style={{
                    ...panelStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Case number
                  </span>
                  <strong
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {caseNumber}
                  </strong>
                  <Copy
                    size={12}
                    style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    margin: 0,
                  }}
                >
                  Expected response time: 24-48 hours
                </p>
              </motion.div>
            ) : step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 4px',
                  }}
                >
                  Verify ownership of the original work
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 16px',
                  }}
                >
                  We'll verify your ownership via the C2PA manifest attached to
                  the original render.
                </p>

                <div
                  style={{
                    ...panelStyle,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 110,
                      height: 62,
                      borderRadius: 'var(--radius-sm)',
                      background:
                        'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 2,
                      }}
                    >
                      {match.originalTitle}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        marginBottom: 8,
                      }}
                    >
                      {match.originalProject} • {match.originalDuration}
                    </div>
                    <span style={badgeStyle}>
                      <Check size={10} /> C2PA Verified
                    </span>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: '0.5px solid var(--border)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ownershipConfirmed}
                    onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    I am the copyright holder of this work, or am authorized to
                    act on behalf of the copyright holder.
                  </span>
                </label>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 14px',
                  }}
                >
                  Match details
                </h3>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Match URL</label>
                  <input
                    type="text"
                    value={match.matchUrl}
                    readOnly
                    style={{ ...inputStyle, cursor: 'not-allowed' }}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Platform</label>
                    <div style={{ ...inputStyle, padding: '8px 12px' }}>
                      {match.platform}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Match Strength</label>
                    <div
                      style={{
                        ...inputStyle,
                        padding: '8px 12px',
                        color: '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {match.matchStrength}%
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Your Content</label>
                    <div
                      style={{
                        height: 100,
                        borderRadius: 'var(--radius-md)',
                        background:
                          'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                        border: '0.5px solid var(--border)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Infringing Content</label>
                    <div
                      style={{
                        height: 100,
                        borderRadius: 'var(--radius-md)',
                        background:
                          'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                        border: '0.5px solid var(--border)',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    ...panelStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Check size={14} style={{ color: '#4ade80' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Watermark detected in infringing content
                  </div>
                  <span style={{ marginLeft: 'auto', ...badgeStyle }}>
                    <Check size={10} /> Auto-filled
                  </span>
                </div>
              </motion.div>
            ) : step === 3 ? (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 14px',
                  }}
                >
                  File DMCA notice
                </h3>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>
                      Full Name <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Address <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Good Faith Statement</label>
                    <textarea
                      value={form.goodFaithStatement}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          goodFaithStatement: e.target.value,
                        })
                      }
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.penaltyAcknowledged}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          penaltyAcknowledged: e.target.checked,
                        })
                      }
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      I swear, under penalty of perjury, that the information in
                      this notification is accurate and that I am the copyright
                      owner or authorized to act on behalf of the copyright
                      owner.
                    </span>
                  </label>
                  <div>
                    <label style={labelStyle}>
                      Electronic Signature{' '}
                      <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.signature}
                      onChange={(e) =>
                        setForm({ ...form, signature: e.target.value })
                      }
                      placeholder="Type your full name"
                      style={{
                        ...inputStyle,
                        fontFamily: 'cursive',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 14px',
                  }}
                >
                  Review & submit
                </h3>

                <div style={{ ...panelStyle, marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 8,
                    }}
                  >
                    Original Work
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {match.originalTitle}
                  </div>
                  <div
                    style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  >
                    {match.originalProject}
                  </div>
                </div>

                <div style={{ ...panelStyle, marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 8,
                    }}
                  >
                    Infringing URL
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-all',
                      marginBottom: 4,
                    }}
                  >
                    {match.matchUrl}
                  </div>
                  <div
                    style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  >
                    {match.platform} • {match.matchStrength}% match
                  </div>
                </div>

                <div style={{ ...panelStyle, marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 8,
                    }}
                  >
                    Filer
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {form.fullName}
                  </div>
                  <div
                    style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  >
                    {form.address}
                  </div>
                  {form.phone && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {form.phone}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245,158,11,0.08)',
                    border: '0.5px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                  <div
                    style={{ fontSize: 11, color: 'var(--text-secondary)' }}
                  >
                    Estimated response time: 24-48 hours
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        {!submitted && (
          <div style={footerStyle}>
            <div>
              {step > 1 && (
                <button onClick={prev} style={ghostBtn}>
                  <ChevronLeft size={14} /> Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={close} style={ghostBtn}>
                Cancel
              </button>
              {step < 4 ? (
                <button
                  onClick={next}
                  disabled={!canContinue()}
                  style={{
                    ...primaryBtn,
                    opacity: canContinue() ? 1 : 0.5,
                    cursor: canContinue() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} style={primaryBtn}>
                  <FileText size={14} /> Submit DMCA notice
                </button>
              )}
            </div>
          </div>
        )}

        {submitted && (
          <div style={footerStyle}>
            <div />
            <button onClick={close} style={primaryBtn}>
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
