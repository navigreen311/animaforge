'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/sidebar/Sidebar';
import ShortcutsModal from '@/components/ui/ShortcutsModal';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/stores/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSearchModalOpen = useUIStore((s) => s.setSearchModalOpen);
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);
  const setRenderPanelExpanded = useUIStore((s) => s.setRenderPanelExpanded);
  const searchModalOpen = useUIStore((s) => s.searchModalOpen);
  const newProjectModalOpen = useUIStore((s) => s.newProjectModalOpen);
  const renderPanelExpanded = useUIStore((s) => s.renderPanelExpanded);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Auto-login: ensure demo session exists on mount
  useEffect(() => {
    const store = useAuthStore.getState();
    if (!store.isAuthenticated) {
      store.loadFromStorage();
    }
  }, []);

  // ── Keyboard shortcut handlers ─────────────────────────────
  const toggleShortcuts = useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []);

  const handleEscape = useCallback(() => {
    if (shortcutsOpen) { setShortcutsOpen(false); return; }
    if (searchModalOpen) { setSearchModalOpen(false); return; }
    if (newProjectModalOpen) { setNewProjectModalOpen(false); return; }
    if (renderPanelExpanded) { setRenderPanelExpanded(false); return; }
  }, [
    shortcutsOpen,
    searchModalOpen,
    newProjectModalOpen,
    renderPanelExpanded,
    setSearchModalOpen,
    setNewProjectModalOpen,
    setRenderPanelExpanded,
  ]);

  useKeyboardShortcuts({
    'search':         () => setSearchModalOpen(true),
    'new-project':    () => setNewProjectModalOpen(true),
    'shortcuts':      toggleShortcuts,
    'escape':         handleEscape,
    'go-projects':    () => router.push('/projects'),
    'go-characters':  () => router.push('/characters'),
    'go-timeline':    () => router.push('/timeline'),
    'go-assets':      () => router.push('/assets'),
    'go-settings':    () => router.push('/settings'),
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: sidebarCollapsed ? '56px 1fr' : 'var(--sidebar-width) 1fr',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        transition: 'grid-template-columns 200ms ease',
      }}
    >
      <Sidebar />
      <main style={{ overflowY: 'auto', height: '100vh' }}>
        {children}
      </main>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
