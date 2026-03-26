"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

const workspaces: Workspace[] = [
  { id: "animaforge-studio", name: "AnimaForge Studio" },
  { id: "personal", name: "Personal Workspace" },
];

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("animaforge-studio");
  const containerRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeId)!;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          maxWidth: "180px",
          width: "auto",
          padding: "0",
          margin: "0",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            minWidth: "10px",
            borderRadius: "2px",
            backgroundColor: "var(--brand)",
          }}
        />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activeWorkspace.name}
        </span>
        <ChevronDown
          size={14}
          style={{ color: "var(--text-tertiary)", minWidth: "14px" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "0",
            minWidth: "200px",
            padding: "4px",
            backgroundColor: "var(--bg-elevated)",
            border: "0.5px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)",
            zIndex: 50,
          }}
        >
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeId;

            return (
              <button
                key={workspace.id}
                role="menuitem"
                type="button"
                onClick={() => {
                  setActiveId(workspace.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "var(--bg-active)" : "transparent",
                  color: isActive ? "var(--text-brand)" : "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive
                    ? "var(--bg-active)"
                    : "transparent";
                }}
              >
                <span>{workspace.name}</span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}

          <div
            style={{
              height: "1px",
              backgroundColor: "var(--border-strong)",
              margin: "4px 0",
            }}
          />

          <button
            role="menuitem"
            type="button"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 10px",
              fontSize: "12px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              backgroundColor: "transparent",
              color: "var(--text-tertiary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Plus size={14} />
            <span>Create workspace</span>
          </button>
        </div>
      )}
    </div>
  );
}
