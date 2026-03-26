"use client";

import { Cpu } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

interface RenderQueueBadgeProps {
  activeJobCount: number;
  onClick?: () => void;
}

export default function RenderQueueBadge({
  activeJobCount,
  onClick,
}: RenderQueueBadgeProps) {
  const { renderPanelExpanded, setRenderPanelExpanded } = useUIStore();

  const isActive = activeJobCount > 0;

  const handleClick = () => {
    setRenderPanelExpanded(!renderPanelExpanded);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Render queue: ${activeJobCount} active jobs`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: "var(--radius-md)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        opacity: isActive ? 1 : 0.5,
        transition: "background 150ms ease, opacity 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Cpu
        size={16}
        style={{
          color: isActive
            ? "var(--status-generating-text)"
            : "var(--text-tertiary)",
        }}
      />

      {isActive && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--status-generating-bg)",
            border: "0.5px solid var(--status-generating-border)",
            color: "var(--status-generating-text)",
            fontSize: 8,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {activeJobCount}
        </span>
      )}
    </button>
  );
}
