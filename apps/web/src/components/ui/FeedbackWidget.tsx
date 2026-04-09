'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FeedbackType = 'bug' | 'feature' | 'general';

/* ------------------------------------------------------------------ */
/*  FeedbackWidget                                                     */
/* ------------------------------------------------------------------ */

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const id = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const handleSubmit = () => {
    // Mock POST /api/feedback
    console.log('POST /api/feedback', { type, message, url: currentUrl });
    setOpen(false);
    setMessage('');
    setType('general');
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const radioOptions: { value: FeedbackType; label: string }[] = [
    { value: 'bug', label: 'Bug report' },
    { value: 'feature', label: 'Feature request' },
    { value: 'general', label: 'General' },
  ];

  return (
    <>
      {/* ── Floating trigger button ───────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        title="Send feedback"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9990,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--brand)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
        }}
      >
        <MessageCircle size={22} />
      </motion.button>

      {/* ── Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Send Feedback
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                    padding: 4,
                  }}
                  aria-label="Close feedback modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Type selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Type
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {radioOptions.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        color: type === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="feedback-type"
                        value={opt.value}
                        checked={type === opt.value}
                        onChange={() => setType(opt.value)}
                        style={{ accentColor: 'var(--brand)' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  style={{
                    width: '100%',
                    background: 'var(--bg-overlay)',
                    border: '0.5px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {message.length}/1000
                </span>
              </div>

              {/* Auto-filled URL */}
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Page: {currentUrl}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '0.5px solid var(--border-strong)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!message.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: !message.trim() ? 'var(--bg-overlay)' : 'var(--brand)',
                    color: !message.trim() ? 'var(--text-tertiary)' : '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !message.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send feedback
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success toast ─────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 80,
              right: 24,
              zIndex: 9998,
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--status-complete-border)',
              color: 'var(--status-complete-text)',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            Thanks for your feedback!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
