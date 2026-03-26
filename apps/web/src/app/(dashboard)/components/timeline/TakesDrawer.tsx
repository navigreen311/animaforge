"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Take {
  id: string;
  number: number;
  tier: "preview" | "standard" | "final";
  timeAgo: string;
  quality: number;
  thumbnailUrl?: string;
}

interface TakesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shotId: string;
  shotNumber: number;
}

/* ------------------------------------------------------------------ */
/*  Tier badge styles                                                  */
/* ------------------------------------------------------------------ */

const TIER_STYLES: Record<
  Take["tier"],
  { background: string; color: string; border?: string }
> = {
  preview: {
    background: "var(--status-draft-bg, rgba(255,255,255,0.06))",
    color: "var(--status-draft-text, var(--text-tertiary))",
    border: "0.5px solid var(--status-draft-border, transparent)",
  },
  standard: {
    background: "var(--brand-dim, rgba(99,102,241,0.15))",
    color: "var(--brand-light, var(--brand))",
  },
  final: {
    background: "var(--status-complete-bg, rgba(34,197,94,0.12))",
    color: "var(--status-complete-text, #4ade80)",
    border: "0.5px solid var(--status-complete-border, transparent)",
  },
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_TAKES: Take[] = [
  {
    id: "take-3",
    number: 3,
    tier: "standard",
    timeAgo: "2 min ago",
    quality: 82,
    thumbnailUrl: undefined,
  },
  {
    id: "take-2",
    number: 2,
    tier: "preview",
    timeAgo: "1 hour ago",
    quality: 68,
    thumbnailUrl: undefined,
  },
  {
    id: "take-1",
    number: 1,
    tier: "preview",
    timeAgo: "3 hours ago",
    quality: 54,
    thumbnailUrl: undefined,
  },
];

/* ------------------------------------------------------------------ */
/*  Slide animation                                                    */
/* ------------------------------------------------------------------ */

const drawerVariants = {
  hidden: { x: 280 },
  visible: { x: 0 },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TakesDrawer({
  isOpen,
  onClose,
  shotId,
  shotNumber,
}: TakesDrawerProps) {
  const [takes, setTakes] = useState<Take[]>(MOCK_TAKES);
  const [activeTakeId, setActiveTakeId] = useState<string>("take-3");
  const [hoveredTakeId, setHoveredTakeId] = useState<string | null>(null);

  /* ---- Handlers ---- */

  function handleSetActive(take: Take) {
    setActiveTakeId(take.id);
    toast(`Take ${take.number} set as active`);
  }

  function handleDelete(take: Take) {
    if (take.id === activeTakeId) return;
    setTakes((prev) => prev.filter((t) => t.id !== take.id));
    toast(`Take ${take.number} deleted`);
  }

  function handleGenerateNew() {
    toast("Generating new take...");
  }

  /* ---- Quality color helper ---- */

  function qualityColor(q: number): string {
    if (q >= 80) return "var(--status-complete-text, #4ade80)";
    if (q >= 60) return "var(--status-warning-text, #facc15)";
    return "var(--status-error-text, #f87171)";
  }

  /* ---- Render ---- */

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="takes-drawer"
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 280,
            height: "100%",
            zIndex: 50,
            backgroundColor: "var(--bg-elevated)",
            borderLeft: "0.5px solid var(--border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ---- Header ---- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 12px 10px",
              borderBottom: "0.5px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Layers
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-secondary)" }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Shot {shotNumber} — All Takes
              </span>
            </div>

            <button
              type="button"
              aria-label="Close takes drawer"
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-tertiary)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ---- Takes list ---- */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 10px 0",
            }}
          >
            {takes.length === 0 ? (
              /* ---- Empty state ---- */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 16px",
                  textAlign: "center",
                }}
              >
                <Layers
                  size={28}
                  strokeWidth={1.4}
                  style={{
                    color: "var(--text-quaternary)",
                    marginBottom: 12,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  No takes yet. Generate this shot to create the first take.
                </span>
              </div>
            ) : (
              takes.map((take) => {
                const isActive = take.id === activeTakeId;
                const isHovered = take.id === hoveredTakeId;
                const tierStyle = TIER_STYLES[take.tier];

                return (
                  <div
                    key={take.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSetActive(take)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSetActive(take);
                      }
                    }}
                    onMouseEnter={() => setHoveredTakeId(take.id)}
                    onMouseLeave={() => setHoveredTakeId(null)}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: 8,
                      marginBottom: 6,
                      backgroundColor: "var(--bg-surface)",
                      border: isActive
                        ? "1px solid var(--brand)"
                        : "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      position: "relative",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* ---- Thumbnail placeholder ---- */}
                    <div
                      style={{
                        width: 60,
                        height: 34,
                        minWidth: 60,
                        borderRadius: 4,
                        backgroundColor: "var(--bg-overlay)",
                        backgroundImage: take.thumbnailUrl
                          ? `url(${take.thumbnailUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />

                    {/* ---- Info ---- */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {/* Row 1: Take number + Active badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          Take {take.number}
                        </span>

                        {isActive && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              padding: "1px 5px",
                              borderRadius: "var(--radius-sm)",
                              background:
                                "var(--brand-dim, rgba(99,102,241,0.15))",
                              color: "var(--brand-light, var(--brand))",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>

                      {/* Row 2: Tier badge + timeAgo */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 500,
                            padding: "1px 5px",
                            borderRadius: "var(--radius-sm)",
                            background: tierStyle.background,
                            color: tierStyle.color,
                            border: tierStyle.border ?? "none",
                            textTransform: "capitalize",
                          }}
                        >
                          {take.tier}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-quaternary)",
                          }}
                        >
                          {take.timeAgo}
                        </span>
                      </div>

                      {/* Row 3: Quality */}
                      <span
                        style={{
                          fontSize: 10,
                          color: qualityColor(take.quality),
                          fontWeight: 500,
                        }}
                      >
                        Quality {take.quality}%
                      </span>
                    </div>

                    {/* ---- Delete button (hover only, not on active) ---- */}
                    {!isActive && isHovered && (
                      <button
                        type="button"
                        aria-label={`Delete take ${take.number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(take);
                        }}
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: "var(--bg-hover)",
                          color: "var(--text-tertiary)",
                          cursor: "pointer",
                          padding: 0,
                          transition: "color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color =
                            "var(--status-error-text, #f87171)";
                          e.currentTarget.style.background =
                            "var(--status-error-bg, rgba(248,113,113,0.1))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-tertiary)";
                          e.currentTarget.style.background = "var(--bg-hover)";
                        }}
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ---- Footer: Generate button ---- */}
          <div
            style={{
              flexShrink: 0,
              padding: "10px 10px 14px",
              borderTop: "0.5px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={handleGenerateNew}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 34,
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: "var(--brand)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Generate New Take
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
