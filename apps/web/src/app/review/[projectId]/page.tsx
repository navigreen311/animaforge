'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ShotStatus = 'pending' | 'approved' | 'changes_requested';

interface Shot {
  id: string;
  number: number;
  description: string;
  duration: string;
  status: ShotStatus;
  comment: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SHOTS: Shot[] = [
  { id: 's1', number: 1, description: 'Wide establishing shot - city skyline at dusk with neon reflections', duration: '4.2s', status: 'pending', comment: '' },
  { id: 's2', number: 2, description: 'Medium close-up - protagonist enters the lobby, camera tracks left', duration: '3.8s', status: 'pending', comment: '' },
  { id: 's3', number: 3, description: 'Over-the-shoulder - dialogue exchange at the reception desk', duration: '6.1s', status: 'pending', comment: '' },
  { id: 's4', number: 4, description: 'Close-up - hand pressing elevator button, reflection in chrome', duration: '2.4s', status: 'pending', comment: '' },
  { id: 's5', number: 5, description: 'Elevator interior - ascending with ambient light changes per floor', duration: '5.0s', status: 'pending', comment: '' },
  { id: 's6', number: 6, description: 'Corridor walk - long tracking shot with parallax depth layers', duration: '7.3s', status: 'pending', comment: '' },
  { id: 's7', number: 7, description: 'Door reveal - push-in as door opens to rooftop panorama', duration: '3.5s', status: 'pending', comment: '' },
  { id: 's8', number: 8, description: 'Final wide - protagonist silhouette against sunset, camera pulls back', duration: '5.8s', status: 'pending', comment: '' },
  { id: 's9', number: 9, description: 'Title card fade-in with particle effects overlay', duration: '3.0s', status: 'pending', comment: '' },
  { id: 's10', number: 10, description: 'End credits scroll with miniature scene vignettes', duration: '8.0s', status: 'pending', comment: '' },
];

const PROJECT_TITLE = 'Neon Horizons - Episode 1';

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ShotStatus }) {
  const config: Record<ShotStatus, { bg: string; text: string; border: string; label: string }> = {
    pending: { bg: 'rgba(234,179,8,0.12)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)', label: 'Pending' },
    approved: { bg: 'rgba(52,211,153,0.12)', text: '#6ee7b7', border: 'rgba(52,211,153,0.3)', label: 'Approved' },
    changes_requested: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Changes requested' },
  };
  const c = config[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill, 20px)',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Invalid token page                                                 */
/* ------------------------------------------------------------------ */

function InvalidTokenPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #0a0a0f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 8px' }}>
          Invalid Review Link
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, rgba(226,232,240,0.55))', lineHeight: 1.6, margin: 0 }}>
          This review link is invalid or has expired. Please request a new link from the project owner.
        </p>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand, #7c3aed)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>AnimaForge</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ReviewPortalPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [shots, setShots] = useState<Shot[]>(MOCK_SHOTS);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ shotId: string; action: ShotStatus | 'comment' } | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load reviewer name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('animaforge_reviewer_name');
    if (stored) setReviewerName(stored);
  }, []);

  const ensureReviewerName = useCallback(
    (shotId: string, action: ShotStatus | 'comment') => {
      if (!reviewerName) {
        setPendingAction({ shotId, action });
        setShowNamePrompt(true);
        return false;
      }
      return true;
    },
    [reviewerName],
  );

  const confirmName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setReviewerName(trimmed);
    localStorage.setItem('animaforge_reviewer_name', trimmed);
    setShowNamePrompt(false);

    if (pendingAction) {
      if (pendingAction.action === 'comment') {
        setShowCommentFor(pendingAction.shotId);
      } else {
        setShots((prev) =>
          prev.map((s) => (s.id === pendingAction.shotId ? { ...s, status: pendingAction.action as ShotStatus } : s)),
        );
      }
      setPendingAction(null);
    }
  };

  const handleAction = (shotId: string, action: ShotStatus) => {
    if (!ensureReviewerName(shotId, action)) return;
    setShots((prev) => prev.map((s) => (s.id === shotId ? { ...s, status: action } : s)));
  };

  const handleComment = (shotId: string) => {
    if (!ensureReviewerName(shotId, 'comment')) return;
    setShowCommentFor(showCommentFor === shotId ? null : shotId);
  };

  const submitComment = (shotId: string) => {
    const text = commentDraft[shotId]?.trim();
    if (!text) return;
    setShots((prev) => prev.map((s) => (s.id === shotId ? { ...s, comment: text } : s)));
    setShowCommentFor(null);
  };

  const handleSubmitAll = () => {
    setSubmitted(true);
  };

  // ── Token validation ───────────────────────────────────────
  if (!token) return <InvalidTokenPage />;

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-base, #0a0a0f)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans, system-ui)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9989;</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', margin: '0 0 8px' }}>
            Feedback Submitted
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, rgba(226,232,240,0.55))', lineHeight: 1.6 }}>
            Thank you, {reviewerName}! Your review for <strong>{PROJECT_TITLE}</strong> has been submitted.
            The project team will be notified.
          </p>
        </div>
      </div>
    );
  }

  // ── Summary counts ─────────────────────────────────────────
  const approved = shots.filter((s) => s.status === 'approved').length;
  const changesRequested = shots.filter((s) => s.status === 'changes_requested').length;
  const pending = shots.filter((s) => s.status === 'pending').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #0a0a0f)',
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--text-primary, #e2e8f0)',
        paddingBottom: 80,
      }}
    >
      {/* ── Name Prompt Modal ────────────────────────────── */}
      {showNamePrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'var(--bg-elevated, #13131f)',
              border: '1px solid var(--border, rgba(255,255,255,0.07))',
              borderRadius: 'var(--radius-lg, 10px)',
              padding: 24,
              width: 360,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Enter your name</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Your name will be attached to your review feedback.
            </p>
            <input
              autoFocus
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                background: 'var(--bg-surface, #0f0f1a)',
                border: '1px solid var(--border-strong, rgba(255,255,255,0.13))',
                borderRadius: 'var(--radius-md, 8px)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmName((e.target as HTMLInputElement).value);
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => { setShowNamePrompt(false); setPendingAction(null); }}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="Your name"]');
                  if (input) confirmName(input.value);
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  background: 'var(--brand, #7c3aed)',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand, #7c3aed)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span style={{ fontWeight: 600, fontSize: 15 }}>AnimaForge</span>
        <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>|</span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{PROJECT_TITLE}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill, 20px)',
            background: 'var(--brand-dim, rgba(124,58,237,0.2))',
            color: 'var(--brand-light, #a78bfa)',
            fontWeight: 500,
          }}
        >
          Review Portal
        </span>
      </header>

      {/* ── Shots grid ───────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '24px 24px',
        }}
      >
        {reviewerName && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Reviewing as <strong style={{ color: 'var(--text-primary)' }}>{reviewerName}</strong>
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {shots.map((shot) => (
            <div
              key={shot.id}
              style={{
                background: 'var(--bg-elevated, #13131f)',
                border: '1px solid var(--border, rgba(255,255,255,0.07))',
                borderRadius: 'var(--radius-lg, 10px)',
                overflow: 'hidden',
              }}
            >
              {/* Preview placeholder */}
              <div
                style={{
                  height: 160,
                  background: 'var(--bg-overlay, #1a1a2e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                }}
              >
                Shot {shot.number} Preview
              </div>

              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Shot {shot.number}</span>
                  <StatusBadge status={shot.status} />
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {shot.description}
                </p>

                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
                  Duration: {shot.duration}
                </p>

                {shot.comment && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-surface, #0f0f1a)',
                      borderRadius: 'var(--radius-sm, 6px)',
                      padding: '6px 10px',
                      marginBottom: 10,
                      borderLeft: '3px solid var(--brand, #7c3aed)',
                    }}
                  >
                    {shot.comment}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAction(shot.id, 'approved')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: 12,
                      fontWeight: 500,
                      background: shot.status === 'approved' ? 'rgba(52,211,153,0.2)' : 'transparent',
                      border: `1px solid ${shot.status === 'approved' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md, 8px)',
                      color: shot.status === 'approved' ? '#6ee7b7' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Approve &#10003;
                  </button>
                  <button
                    onClick={() => handleAction(shot.id, 'changes_requested')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: 12,
                      fontWeight: 500,
                      background: shot.status === 'changes_requested' ? 'rgba(239,68,68,0.2)' : 'transparent',
                      border: `1px solid ${shot.status === 'changes_requested' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md, 8px)',
                      color: shot.status === 'changes_requested' ? '#f87171' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Changes &#10007;
                  </button>
                  <button
                    onClick={() => handleComment(shot.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    &#128172;
                  </button>
                </div>

                {/* Comment input */}
                {showCommentFor === shot.id && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      autoFocus
                      value={commentDraft[shot.id] || ''}
                      onChange={(e) => setCommentDraft((d) => ({ ...d, [shot.id]: e.target.value }))}
                      placeholder="Add your feedback..."
                      style={{
                        width: '100%',
                        minHeight: 60,
                        padding: '8px 10px',
                        fontSize: 12,
                        background: 'var(--bg-surface, #0f0f1a)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-md, 8px)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                      <button
                        onClick={() => setShowCommentFor(null)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm, 6px)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitComment(shot.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          background: 'var(--brand, #7c3aed)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm, 6px)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky bottom bar ────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-elevated, #13131f)',
          borderTop: '1px solid var(--border, rgba(255,255,255,0.07))',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: '#6ee7b7' }}>{approved} approved</span>
          <span style={{ color: '#f87171' }}>{changesRequested} changes</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{pending} pending</span>
        </div>
        <button
          onClick={handleSubmitAll}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--brand, #7c3aed)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            cursor: 'pointer',
          }}
        >
          Submit all feedback
        </button>
      </div>
    </div>
  );
}
