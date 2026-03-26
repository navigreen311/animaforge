"use client";

import { useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export default function GlobalSearch() {
  const searchModalOpen = useUIStore((s) => s.searchModalOpen);
  const setSearchModalOpen = useUIStore((s) => s.setSearchModalOpen);

  /* ── Cmd+K global shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchModalOpen]);

  return (
    <>
      {/* ── Search trigger bar ── */}
      <button
        type="button"
        onClick={() => setSearchModalOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "0 12px",
          height: 32,
          cursor: "pointer",
          gap: 8,
          outline: "none",
          transition: "border-color 150ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-brand)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.borderColor = "var(--border-brand)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <Search
          size={14}
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        />

        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          Search shots, assets, characters…
        </span>

        <kbd
          style={{
            marginLeft: "auto",
            background: "var(--bg-overlay)",
            border: "0.5px solid var(--border)",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 9,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.4,
            userSelect: "none",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* ── Search modal ── */}
      {searchModalOpen && <SearchModal onClose={() => setSearchModalOpen(false)} />}
    </>
  );
}

/* ──────────────────────────────────────────────
   Search Modal
   ────────────────────────────────────────────── */

function SearchModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /* ── Autofocus ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ── Escape to close ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Focus trap ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  /* ── Overlay click ── */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          width: 480,
          maxHeight: 400,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Search input ── */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search projects, shots, assets, characters…"
          style={{
            width: "100%",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 16,
            fontFamily: "inherit",
          }}
        />

        {/* ── Results placeholder ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            fontSize: 12,
            color: "var(--text-tertiary)",
            userSelect: "none",
          }}
        >
          No results yet
        </div>
      </div>
    </div>
  );
}
