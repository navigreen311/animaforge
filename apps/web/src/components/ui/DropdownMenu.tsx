"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DropdownMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  separator?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolves the final opening direction.
 * If the anchor is in the lower third of the viewport we flip to open upward.
 */
function resolvePosition(
  anchorEl: HTMLElement | null | undefined,
  preferred: DropdownMenuProps["position"]
): NonNullable<DropdownMenuProps["position"]> {
  if (!anchorEl) return preferred ?? "bottom-left";

  const rect = anchorEl.getBoundingClientRect();
  const nearBottom = rect.bottom > window.innerHeight * 0.7;

  if (nearBottom) {
    if (preferred === "bottom-left" || !preferred) return "top-left";
    if (preferred === "bottom-right") return "top-right";
  }

  return preferred ?? "bottom-left";
}

function positionStyles(
  pos: NonNullable<DropdownMenuProps["position"]>
): React.CSSProperties {
  switch (pos) {
    case "bottom-left":
      return { top: "100%", left: 0, marginTop: 4 };
    case "bottom-right":
      return { top: "100%", right: 0, marginTop: 4 };
    case "top-left":
      return { bottom: "100%", left: 0, marginBottom: 4 };
    case "top-right":
      return { bottom: "100%", right: 0, marginBottom: 4 };
  }
}

const originMap: Record<string, string> = {
  "bottom-left": "top left",
  "bottom-right": "top right",
  "top-left": "bottom left",
  "top-right": "bottom right",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DropdownMenu({
  items,
  isOpen,
  onClose,
  anchorRef,
  position: preferredPosition,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  const resolvedPosition = resolvePosition(
    anchorRef?.current,
    preferredPosition
  );

  /* ---- Reset focus index whenever menu opens/closes ---- */
  useEffect(() => {
    if (isOpen) {
      setFocusIndex(-1);
    }
  }, [isOpen]);

  /* ---- Close on outside click ---- */
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !(anchorRef?.current && anchorRef.current.contains(target))
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, anchorRef]);

  /* ---- Keyboard navigation ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledIndices = items
        .map((item, i) => (item.disabled ? -1 : i))
        .filter((i) => i !== -1);

      if (enabledIndices.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const currentPos = enabledIndices.indexOf(focusIndex);
          const next =
            currentPos < enabledIndices.length - 1
              ? enabledIndices[currentPos + 1]
              : enabledIndices[0];
          setFocusIndex(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const currentPos = enabledIndices.indexOf(focusIndex);
          const prev =
            currentPos > 0
              ? enabledIndices[currentPos - 1]
              : enabledIndices[enabledIndices.length - 1];
          setFocusIndex(prev);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (focusIndex >= 0 && !items[focusIndex].disabled) {
            items[focusIndex].onClick();
            onClose();
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [items, focusIndex, onClose]
  );

  /* ---- Render ---- */
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          role="menu"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={{
            position: "absolute",
            ...positionStyles(resolvedPosition),
            transformOrigin: originMap[resolvedPosition],
            background: "var(--bg-elevated)",
            border: "0.5px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.24), 0 1px 4px rgba(0, 0, 0, 0.12)",
            zIndex: 50,
            minWidth: 180,
            padding: 4,
            outline: "none",
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isDanger = item.variant === "danger";
            const isFocused = focusIndex === index;
            const isDisabled = !!item.disabled;

            return (
              <div key={`${item.label}-${index}`}>
                {/* Separator */}
                {item.separator && (
                  <div
                    style={{
                      height: 0,
                      borderTop: "0.5px solid var(--border)",
                      margin: "4px 0",
                    }}
                  />
                )}

                {/* Menu item */}
                <button
                  role="menuitem"
                  disabled={isDisabled}
                  tabIndex={-1}
                  onClick={() => {
                    if (isDisabled) return;
                    item.onClick();
                    onClose();
                  }}
                  onMouseEnter={() => {
                    if (!isDisabled) setFocusIndex(index);
                  }}
                  onMouseLeave={() => setFocusIndex(-1)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 12px",
                    fontSize: 11,
                    lineHeight: 1.4,
                    border: "none",
                    background: isFocused
                      ? "var(--bg-hover)"
                      : "transparent",
                    borderRadius: "var(--radius-sm)",
                    color:
                      isDanger && isFocused
                        ? "#ef4444"
                        : "inherit",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.4 : 1,
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 80ms ease, color 80ms ease",
                  }}
                >
                  {Icon && (
                    <Icon
                      size={14}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
