"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderKanban,
  Film,
  Calendar,
  Users,
  FileText,
  Palette,
  User,
  Music,
  Radio,
  Image,
  Brush,
  BarChart3,
  Shield,
  Store,
  UserPlus,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import NavSection from "./NavSection";
import NavItem from "./NavItem";
import CreditsWidget from "./CreditsWidget";
import { useUIStore } from "@/store/useUIStore";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 200; // matches var(--sidebar-width)

const sidebarVariants = {
  expanded: { width: EXPANDED_WIDTH },
  collapsed: { width: COLLAPSED_WIDTH },
};

const fadeVariants = {
  visible: { opacity: 1, transition: { delay: 0.05, duration: 0.15 } },
  hidden: { opacity: 0, transition: { duration: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  return (
    <motion.aside
      initial={false}
      animate={collapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        backgroundColor: "var(--bg-surface)",
        borderRight: "0.5px solid var(--border)",
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* ---- Logo area ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "16px 0" : "16px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* AF mark */}
        <div
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: "var(--radius-sm)",
            background: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          AF
        </div>

        {/* Wordmark */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="wordmark"
              variants={fadeVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
            >
              AnimaForge
            </motion.span>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: collapsed ? "relative" : "absolute",
            right: collapsed ? undefined : 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
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
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>

      {/* ---- Navigation ---- */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          paddingTop: 4,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* WORKSPACE */}
        <NavSection title="WORKSPACE" collapsed={collapsed}>
          <NavItem
            href="/projects"
            icon={FolderKanban}
            label="Projects"
            active={pathname === "/projects" || pathname.startsWith("/projects/")}
            collapsed={collapsed}
          />
          <NavItem
            href="/timeline"
            icon={Film}
            label="Timeline"
            active={pathname.startsWith("/timeline")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/calendar"
            icon={Calendar}
            label="Calendar"
            active={pathname.startsWith("/calendar")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/characters"
            icon={Users}
            label="Characters"
            active={pathname.startsWith("/characters")}
            collapsed={collapsed}
          />
        </NavSection>

        {/* CREATE */}
        <NavSection title="CREATE" collapsed={collapsed}>
          <NavItem
            href="/script"
            icon={FileText}
            label="Script AI"
            active={pathname.startsWith("/script")}
            collapsed={collapsed}
          />
          <NavItem
            href="/style"
            icon={Palette}
            label="Style Studio"
            active={pathname.startsWith("/style")}
            collapsed={collapsed}
          />
          <NavItem
            href="/avatar"
            icon={User}
            label="Avatar Studio"
            active={pathname.startsWith("/avatar")}
            collapsed={collapsed}
          />
          <NavItem
            href="/audio"
            icon={Music}
            label="Audio Studio"
            active={pathname.startsWith("/audio")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/live"
            icon={Radio}
            label="Live"
            active={pathname.startsWith("/live")}
            collapsed={collapsed}
            badge="new"
          />
        </NavSection>

        {/* MANAGE */}
        <NavSection title="MANAGE" collapsed={collapsed}>
          <NavItem
            href="/assets"
            icon={Image}
            label="Asset Library"
            active={pathname.startsWith("/assets")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/brand"
            icon={Brush}
            label="Brand Kit"
            active={pathname.startsWith("/brand")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/analytics"
            icon={BarChart3}
            label="Analytics"
            active={pathname.startsWith("/analytics")}
            collapsed={collapsed}
            badge="new"
          />
          <NavItem
            href="/piracy"
            icon={Shield}
            label="Content Protection"
            active={pathname.startsWith("/piracy")}
            collapsed={collapsed}
            badge="new"
          />
        </NavSection>

        {/* PLATFORM */}
        <NavSection title="PLATFORM" collapsed={collapsed}>
          <NavItem
            href="/marketplace"
            icon={Store}
            label="Marketplace"
            active={pathname.startsWith("/marketplace")}
            collapsed={collapsed}
            badge="dot"
          />
          <NavItem
            href="/team"
            icon={UserPlus}
            label="Team"
            active={pathname.startsWith("/team")}
            collapsed={collapsed}
            badge="new"
          />
        </NavSection>
      </nav>

      {/* ---- Bottom pinned area ---- */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "0.5px solid var(--border)",
          paddingBottom: 8,
        }}
      >
        <CreditsWidget
          creditsUsed={4200}
          creditsTotal={10000}
          collapsed={collapsed}
        />

        <NavItem
          href="/settings"
          icon={Settings}
          label="Settings"
          active={pathname.startsWith("/settings")}
          collapsed={collapsed}
          badge="new"
        />
      </div>
    </motion.aside>
  );
}
