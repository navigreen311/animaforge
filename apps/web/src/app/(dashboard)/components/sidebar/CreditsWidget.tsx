"use client";

interface CreditsWidgetProps {
  creditsUsed: number;
  creditsTotal: number;
  collapsed?: boolean;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function CreditsWidget({
  creditsUsed,
  creditsTotal,
  collapsed = false,
}: CreditsWidgetProps) {
  const percentage = creditsTotal > 0 ? (creditsUsed / creditsTotal) * 100 : 0;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const isLow = creditsUsed > creditsTotal * 0.8;
  const fillColor = isLow ? "#ef4444" : "var(--brand)";

  if (collapsed) {
    return (
      <div
        style={{
          padding: "12px",
          margin: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          role="progressbar"
          aria-label="Credits usage"
          aria-valuenow={creditsUsed}
          aria-valuemin={0}
          aria-valuemax={creditsTotal}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="var(--progress-track)"
            strokeWidth="3"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke={fillColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${clampedPercentage * 0.628} 62.8`}
            transform="rotate(-90 12 12)"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px",
        margin: "8px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-elevated)",
        border: "0.5px solid var(--border)",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: "9px",
          color: "var(--text-tertiary)",
          marginBottom: "6px",
        }}
      >
        Credits this month
      </span>

      <div
        role="progressbar"
        aria-label="Credits usage"
        aria-valuenow={creditsUsed}
        aria-valuemin={0}
        aria-valuemax={creditsTotal}
        style={{
          height: "4px",
          borderRadius: "2px",
          backgroundColor: "var(--progress-track)",
          overflow: "hidden",
          marginBottom: "6px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clampedPercentage}%`,
            borderRadius: "2px",
            backgroundColor: fillColor,
            transition: "width 0.3s ease, background-color 0.3s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
          }}
        >
          {formatNumber(creditsUsed)} / {formatNumber(creditsTotal)}
        </span>

        {isLow && (
          <span
            style={{
              fontSize: "10px",
              color: "#ef4444",
              fontWeight: 500,
            }}
          >
            Running low
          </span>
        )}
      </div>

      <a
        href="/upgrade"
        style={{
          display: "inline-block",
          marginTop: "8px",
          fontSize: "10px",
          color: "var(--brand)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
        }}
      >
        Upgrade
      </a>
    </div>
  );
}
