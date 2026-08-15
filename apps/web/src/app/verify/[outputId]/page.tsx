"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  fetchVerification,
  isUnavailable,
  presentStatus,
} from "@/lib/governance/c2pa";
import type {
  ManifestAssertion,
  ServiceUnavailable,
  StatusPresentation,
  VerificationResult,
} from "@/lib/governance/c2pa";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */

const TONE = {
  verified: {
    fg: "#6ee7b7",
    bg: "rgba(52,211,153,0.15)",
    border: "rgba(52,211,153,0.25)",
  },
  warning: {
    fg: "#fbbf24",
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.25)",
  },
  danger: {
    fg: "#f87171",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.25)",
  },
  neutral: {
    fg: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.22)",
  },
} as const;

const card: React.CSSProperties = {
  background: "var(--bg-elevated, #13131f)",
  border: "1px solid var(--border, rgba(255,255,255,0.07))",
  borderRadius: "var(--radius-lg, 10px)",
  padding: "20px 24px",
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-tertiary, rgba(226,232,240,0.4))",
  margin: "0 0 12px",
};

const mono = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function AnimaForgeLogo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        marginBottom: 24,
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: "var(--text-primary, #e2e8f0)",
        }}
      >
        AnimaForge
      </span>
    </div>
  );
}

function StatusIcon({ tone }: { tone: keyof typeof TONE }) {
  const { fg } = TONE[tone];
  const common = {
    width: 36,
    height: 36,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: fg,
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (tone === "verified")
    return (
      <svg {...common}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  if (tone === "danger")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    );
  if (tone === "warning")
    return (
      <svg {...common}>
        <path d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.91A1 1 0 002.54 20h18.92a1 1 0 00.85-1.23l-8.6-14.91a1 1 0 00-1.42 0z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function StatusHero({ presentation }: { presentation: StatusPresentation }) {
  const tone = TONE[presentation.tone];
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: tone.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <StatusIcon tone={presentation.tone} />
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: tone.fg,
          margin: "0 0 8px",
        }}
      >
        {presentation.headline}
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary, rgba(226,232,240,0.6))",
          margin: "0 auto",
          maxWidth: 440,
          lineHeight: 1.6,
        }}
      >
        {presentation.detail}
      </p>
    </div>
  );
}

/**
 * The claim table. Each row states exactly what was established and what was
 * not — "found" and "validated" are separate rows on purpose.
 */
function ClaimRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "yes" | "no" | "unknown";
}) {
  const glyph = state === "yes" ? "✓" : state === "no" ? "✗" : "?";
  const colour =
    state === "yes"
      ? TONE.verified.fg
      : state === "no"
        ? TONE.danger.fg
        : TONE.neutral.fg;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid var(--border, rgba(255,255,255,0.07))",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary, rgba(226,232,240,0.4))",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-primary, #e2e8f0)",
            marginTop: 2,
          }}
        >
          {value}
        </div>
      </div>
      <span
        style={{ fontSize: 18, color: colour, flexShrink: 0 }}
        aria-label={state}
      >
        {glyph}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-tertiary, rgba(226,232,240,0.4))",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-primary, #e2e8f0)",
          fontFamily: monospace ? mono : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : `${date.toUTCString().replace("GMT", "UTC")}`;
}

/* ------------------------------------------------------------------ */
/*  Result view                                                        */
/* ------------------------------------------------------------------ */

function ResultView({
  result,
  outputId,
}: {
  result: VerificationResult;
  outputId: string;
}) {
  const presentation = presentStatus(result);
  const generation = result.manifest?.assertions?.find(
    (a: ManifestAssertion) => a.label === "com.animaforge.generation",
  )?.data as Record<string, unknown> | undefined;

  return (
    <div>
      <StatusHero presentation={presentation} />

      {/* What was actually established */}
      <div style={card}>
        <h3 style={sectionTitle}>What this check establishes</h3>
        <ClaimRow
          label="Provenance record"
          value={
            result.record_found
              ? "AnimaForge holds a record for this output"
              : "No AnimaForge record for this identifier"
          }
          state={result.record_found ? "yes" : "no"}
        />
        <ClaimRow
          label="C2PA manifest embedded in the asset"
          value={
            result.status === "absent"
              ? "No manifest found in the asset"
              : result.manifest_label
                ? result.manifest_label
                : result.mode === "c2pa-embedded"
                  ? "Embedded at generation time"
                  : "Nothing was embedded"
          }
          state={
            result.status === "absent"
              ? "no"
              : result.mode === "c2pa-embedded" || result.manifest_label
                ? "yes"
                : "no"
          }
        />
        <ClaimRow
          label="Signature cryptographically validated"
          value={
            result.cryptographically_verified
              ? "Validated by the c2pa library against the certificate chain"
              : result.status === "invalid"
                ? "Validation failed"
                : "Not checked — this record alone is not proof"
          }
          state={
            result.cryptographically_verified
              ? "yes"
              : result.status === "invalid"
                ? "no"
                : "unknown"
          }
        />
      </div>

      {/* Why, when the answer is anything but "valid" */}
      {result.reason && result.status !== "valid" && (
        <div
          style={{
            ...card,
            background: TONE[presentation.tone].bg,
            border: `1px solid ${TONE[presentation.tone].border}`,
          }}
        >
          <h3 style={{ ...sectionTitle, color: TONE[presentation.tone].fg }}>
            Why
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--text-secondary, rgba(226,232,240,0.7))",
            }}
          >
            {result.reason}
          </p>
        </div>
      )}

      {/* Signature detail — only meaningful when one exists */}
      {result.signature && (
        <div style={card}>
          <h3 style={sectionTitle}>Signature</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px 24px",
            }}
          >
            <Field
              label="Algorithm"
              value={result.signature.algorithm ?? "—"}
            />
            <Field label="Issuer" value={result.signature.issuer ?? "—"} />
            <Field
              label="Certificate serial"
              value={result.signature.cert_serial_number ?? "—"}
              monospace
            />
            <Field
              label="Timestamp (RFC 3161)"
              value={formatTime(result.signature.timestamp)}
            />
          </div>
        </div>
      )}

      {/* Recorded claim */}
      <div style={card}>
        <h3 style={sectionTitle}>Recorded claim</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px 24px",
          }}
        >
          <Field label="Output ID" value={outputId} monospace />
          <Field label="Claim generator" value={result.generator ?? "—"} />
          <Field label="Recorded" value={formatTime(result.created_at)} />
          <Field label="Model" value={result.model_id ?? "—"} />
          <Field label="Record mode" value={result.mode ?? "—"} monospace />
          {generation?.watermark_id ? (
            <Field
              label="Watermark ID"
              value={String(generation.watermark_id)}
              monospace
            />
          ) : null}
        </div>
      </div>

      {/* Raw validation status, when the library had something to say */}
      {result.validation_status.length > 0 && (
        <div style={card}>
          <h3 style={sectionTitle}>Validation log</h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 12,
              lineHeight: 1.8,
              color: "var(--text-secondary, rgba(226,232,240,0.6))",
            }}
          >
            {result.validation_status.map((entry, i) => (
              <li key={`${entry.code ?? "entry"}-${i}`}>
                <span style={{ fontFamily: mono }}>
                  {entry.code ?? "status"}
                </span>
                {entry.explanation ? ` — ${entry.explanation}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p
        style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: "var(--text-tertiary, rgba(226,232,240,0.4))",
          margin: "20px 0 0",
        }}
      >
        A lookup by output ID can only confirm what AnimaForge recorded. To
        validate a specific file, submit the file itself to{" "}
        <code style={{ fontFamily: mono }}>POST /governance/c2pa/verify</code> —
        that is the only check that can return &ldquo;cryptographically
        verified&rdquo;.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  States                                                             */
/* ------------------------------------------------------------------ */

function Notice({
  tone,
  headline,
  detail,
}: {
  tone: keyof typeof TONE;
  headline: string;
  detail: string;
}) {
  return (
    <div>
      <StatusHero presentation={{ headline, detail, tone }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VerifyPage() {
  const params = useParams<{ outputId: string }>();
  const outputId = params?.outputId ?? "";

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<ServiceUnavailable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!outputId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVerification(outputId)
      .then((response) => {
        if (cancelled) return;
        if (isUnavailable(response)) setError(response);
        else setResult(response);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [outputId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base, #0a0a0f)",
        fontFamily: "var(--font-sans, system-ui)",
        color: "var(--text-primary, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 620, width: "100%" }}>
        <AnimaForgeLogo />

        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            textAlign: "center",
            margin: "0 0 32px",
          }}
        >
          Content Verification
        </h1>

        {loading ? (
          <Notice
            tone="neutral"
            headline="Checking…"
            detail="Asking the provenance service about this output."
          />
        ) : error ? (
          <Notice
            tone="neutral"
            headline="Verification unavailable"
            // Never fall back to a green tick when the service cannot be reached.
            detail={`${error.reason} No verification result can be shown, and the absence of one is not evidence either way.`}
          />
        ) : result ? (
          <ResultView result={result} outputId={outputId} />
        ) : (
          <Notice
            tone="neutral"
            headline="Nothing to show"
            detail="No identifier was supplied."
          />
        )}

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary, rgba(226,232,240,0.28))",
            }}
          >
            AnimaForge Content Verification &middot; C2PA via c2pa-node
          </p>
        </div>
      </div>
    </div>
  );
}
