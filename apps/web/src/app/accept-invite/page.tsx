'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type InviteState = 'loading' | 'valid' | 'expired' | 'already_used' | 'invalid';

interface InviteDetails {
  inviterName: string;
  workspaceName: string;
  role: string;
  projectAccess: string[];
}

/* ------------------------------------------------------------------ */
/*  Mock invite resolution                                             */
/* ------------------------------------------------------------------ */

function resolveInvite(token: string | null): { state: InviteState; details?: InviteDetails } {
  if (!token) return { state: 'invalid' };
  if (token === 'expired') return { state: 'expired' };
  if (token === 'used') return { state: 'already_used' };
  if (token.length < 4) return { state: 'invalid' };
  return {
    state: 'valid',
    details: {
      inviterName: 'Sarah Chen',
      workspaceName: 'Neon Studio',
      role: 'Editor',
      projectAccess: ['Neon Horizons', 'Brand Intro', 'Product Demo'],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  AnimaForge logo                                                    */
/* ------------------------------------------------------------------ */

function AnimaForgeLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary, #e2e8f0)' }}>AnimaForge</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [inviteState, setInviteState] = useState<InviteState>('loading');
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Simulate loading delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      const result = resolveInvite(token);
      setInviteState(result.state);
      setDetails(result.details ?? null);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    // Mock API call
    await new Promise((r) => setTimeout(r, 1500));
    // Redirect to projects with success message
    router.push('/projects?invite=accepted');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #0a0a0f)',
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--text-primary, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 440, width: '100%' }}>
        <AnimaForgeLogo />

        <AnimatePresence mode="wait">
          {/* ── Loading ──────────────────────────────────── */}
          {inviteState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '3px solid var(--border, rgba(255,255,255,0.07))',
                  borderTopColor: 'var(--brand, #7c3aed)',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Verifying invitation...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          )}

          {/* ── Valid ────────────────────────────────────── */}
          {inviteState === 'valid' && details && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                style={{
                  background: 'var(--bg-elevated, #13131f)',
                  border: '1px solid var(--border, rgba(255,255,255,0.07))',
                  borderRadius: 'var(--radius-xl, 12px)',
                  padding: '32px 28px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--brand-dim, rgba(124,58,237,0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 24,
                  }}
                >
                  &#9993;
                </div>

                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>You&apos;re invited!</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{details.inviterName}</strong> has invited you to join a workspace.
                </p>

                {/* Invite details */}
                <div
                  style={{
                    background: 'var(--bg-surface, #0f0f1a)',
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '16px 20px',
                    textAlign: 'left',
                    marginBottom: 24,
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Workspace</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{details.workspaceName}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Your Role</div>
                    <div style={{ fontSize: 14 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill, 20px)',
                          background: 'var(--brand-dim, rgba(124,58,237,0.2))',
                          color: 'var(--brand-light, #a78bfa)',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {details.role}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Project Access</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {details.projectAccess.map((p) => (
                        <span
                          key={p}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm, 6px)',
                            background: 'var(--bg-overlay, #1a1a2e)',
                            border: '1px solid var(--border)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    background: accepting ? 'var(--brand-dim, rgba(124,58,237,0.2))' : 'var(--brand, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: accepting ? 'not-allowed' : 'pointer',
                    opacity: accepting ? 0.7 : 1,
                    transition: 'opacity 150ms',
                  }}
                >
                  {accepting ? 'Joining workspace...' : 'Accept invitation'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Expired ──────────────────────────────────── */}
          {inviteState === 'expired' && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(234,179,8,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28,
                }}
              >
                &#9203;
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', margin: '0 0 8px' }}>Invitation Expired</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                This invitation link has expired. Please ask the workspace admin to send a new invitation.
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Go to login
              </button>
            </motion.div>
          )}

          {/* ── Already used ─────────────────────────────── */}
          {inviteState === 'already_used' && (
            <motion.div
              key="used"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(96,165,250,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28,
                }}
              >
                &#10003;
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#93c5fd', margin: '0 0 8px' }}>Already Accepted</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                This invitation has already been used. If you&apos;re already a member, head to your projects.
              </p>
              <button
                onClick={() => router.push('/projects')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--brand, #7c3aed)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                }}
              >
                Go to projects
              </button>
            </motion.div>
          )}

          {/* ── Invalid ──────────────────────────────────── */}
          {inviteState === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28,
                }}
              >
                &#10007;
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f87171', margin: '0 0 8px' }}>Invalid Invitation</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                This invitation link is invalid. Please check the URL or request a new invitation from the workspace admin.
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Go to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-base, #0a0a0f)' }} />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
