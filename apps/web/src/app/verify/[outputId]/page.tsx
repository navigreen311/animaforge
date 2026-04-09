'use client';

import { useParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function AnimaForgeLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary, #e2e8f0)' }}>AnimaForge</span>
    </div>
  );
}

function CheckRow({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary, rgba(226,232,240,0.28))' }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary, #e2e8f0)', marginTop: 2 }}>{value}</div>
      </div>
      <span style={{ fontSize: 18, color: passed ? '#6ee7b7' : '#f87171' }}>{passed ? '\u2713' : '\u2717'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Valid state                                                        */
/* ------------------------------------------------------------------ */

function ValidState({ outputId }: { outputId: string }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(52,211,153,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#6ee7b7', margin: '0 0 4px' }}>Verified Content</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, rgba(226,232,240,0.55))', margin: 0 }}>
          This content has a valid C2PA manifest and passes all integrity checks.
        </p>
      </div>

      {/* Details card */}
      <div
        style={{
          background: 'var(--bg-elevated, #13131f)',
          border: '1px solid var(--border, rgba(255,255,255,0.07))',
          borderRadius: 'var(--radius-lg, 10px)',
          padding: '20px 24px',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
          Verification Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Generated</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary, #e2e8f0)' }}>March 25, 2026 at 8:35 AM UTC</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Platform Version</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary, #e2e8f0)' }}>AnimaForge v2.1.0</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Model</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary, #e2e8f0)' }}>animaforge-v2</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Output ID</div>
            <div style={{ fontSize: 13, color: 'var(--brand-light, #a78bfa)', fontFamily: 'var(--font-mono, monospace)' }}>{outputId}</div>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div
        style={{
          background: 'var(--bg-elevated, #13131f)',
          border: '1px solid var(--border, rgba(255,255,255,0.07))',
          borderRadius: 'var(--radius-lg, 10px)',
          padding: '20px 24px',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
          Integrity Checks
        </h3>
        <CheckRow label="Provenance" value="Valid C2PA manifest with signed claim" passed={true} />
        <CheckRow label="Watermark" value="Invisible watermark detected and verified" passed={true} />
        <CheckRow label="Consent" value="All likenesses have documented consent" passed={true} />
      </div>

      {/* C2PA details */}
      <div
        style={{
          background: 'var(--bg-elevated, #13131f)',
          border: '1px solid var(--border, rgba(255,255,255,0.07))',
          borderRadius: 'var(--radius-lg, 10px)',
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
          C2PA Manifest
        </h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Claim Generator:</strong> AnimaForge/2.1.0</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Signature Algorithm:</strong> ES256</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Issuer:</strong> AnimaForge Inc.</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Action:</strong> c2pa.created</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Digital Source Type:</strong> trainedAlgorithmicMedia</div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
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
          View C2PA manifest
        </button>
        <button
          style={{
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 500,
            background: 'transparent',
            color: 'var(--text-secondary, rgba(226,232,240,0.55))',
            border: '1px solid var(--border, rgba(255,255,255,0.07))',
            borderRadius: 'var(--radius-md, 8px)',
            cursor: 'pointer',
          }}
        >
          Download verification report
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Disputed state                                                     */
/* ------------------------------------------------------------------ */

function DisputedState({ outputId }: { outputId: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(234,179,8,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.91A1 1 0 002.54 20h18.92a1 1 0 00.85-1.23l-8.6-14.91a1 1 0 00-1.42 0z" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24', margin: '0 0 8px' }}>Disputed Content</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary, rgba(226,232,240,0.55))', margin: '0 0 24px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        This content has been flagged for dispute. The verification is pending review and the C2PA manifest may have been altered or is under investigation.
      </p>

      <div
        style={{
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: 'var(--radius-lg, 10px)',
          padding: '20px 24px',
          textAlign: 'left',
          maxWidth: 460,
          margin: '0 auto',
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', margin: '0 0 12px' }}>Dispute Information</h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Output ID:</strong> <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--brand-light, #a78bfa)' }}>{outputId}</span></div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Dispute Filed:</strong> April 2, 2026</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> Potential unauthorized likeness usage</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> Under review by Trust & Safety team</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invalid state                                                      */
/* ------------------------------------------------------------------ */

function InvalidState({ outputId }: { outputId: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f87171', margin: '0 0 8px' }}>Not Found</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary, rgba(226,232,240,0.55))', margin: '0 0 8px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        No AnimaForge content was found with the identifier <code style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--brand-light, #a78bfa)', background: 'var(--bg-overlay, #1a1a2e)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{outputId}</code>.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary, rgba(226,232,240,0.28))', margin: 0 }}>
        Please check the ID and try again, or contact support if you believe this is an error.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function VerifyPage() {
  const params = useParams<{ outputId: string }>();
  const outputId = params.outputId ?? '';

  // Determine state based on prefix
  const isValid = outputId.startsWith('af_');
  const isDisputed = outputId.startsWith('disputed_');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #0a0a0f)',
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--text-primary, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 560, width: '100%' }}>
        <AnimaForgeLogo />

        <h1 style={{ fontSize: 20, fontWeight: 600, textAlign: 'center', margin: '0 0 32px', color: 'var(--text-primary)' }}>
          Content Verification
        </h1>

        {isValid ? (
          <ValidState outputId={outputId} />
        ) : isDisputed ? (
          <DisputedState outputId={outputId} />
        ) : (
          <InvalidState outputId={outputId} />
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary, rgba(226,232,240,0.28))' }}>
            AnimaForge Content Verification System &middot; Powered by C2PA
          </p>
        </div>
      </div>
    </div>
  );
}
