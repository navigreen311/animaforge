"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  badge?: "new" | "dot";
  collapsed?: boolean;
}

export default function NavItem({
  icon: Icon,
  label,
  href,
  active = false,
  badge,
  collapsed = false,
}: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const color = active
    ? "var(--text-brand)"
    : hovered
      ? "var(--text-primary)"
      : "var(--text-secondary)";

  const backgroundColor = active
    ? "var(--bg-active)"
    : hovered
      ? "var(--bg-hover)"
      : "transparent";

  const borderLeft = active ? "2px solid var(--brand)" : "2px solid transparent";

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : "8px",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: "6px 10px",
        margin: "1px 8px",
        borderRadius: "var(--radius-md)",
        backgroundColor,
        borderLeft,
        color,
        textDecoration: "none",
        transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease",
        position: "relative",
      }}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon
        size={16}
        style={{
          flexShrink: 0,
          transition: "color 150ms ease",
        }}
      />

      {!collapsed && (
        <>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </span>

          {badge === "new" && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                lineHeight: 1,
                padding: "2px 5px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "rgba(52, 211, 153, 0.15)",
                color: "var(--status-complete-text)",
                border: "0.5px solid rgba(52, 211, 153, 0.25)",
                marginLeft: "auto",
                flexShrink: 0,
                letterSpacing: "0.02em",
              }}
            >
              NEW
            </span>
          )}

          {badge === "dot" && (
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--brand)",
                flexShrink: 0,
                marginLeft: "4px",
              }}
              aria-label="Notification"
            />
          )}
        </>
      )}

      {collapsed && hovered && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm, 6px)",
            backgroundColor: "var(--bg-overlay)",
            border: "0.5px solid var(--border)",
            color: "var(--text-primary)",
            fontSize: "11px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {label}
        </span>
      )}
    </Link>
  );
}
