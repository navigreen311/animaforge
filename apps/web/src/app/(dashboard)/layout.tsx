'use client';

import { useEffect } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/stores/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSearchModalOpen = useUIStore((s) => s.setSearchModalOpen);
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);
  const setRenderPanelExpanded = useUIStore((s) => s.setRenderPanelExpanded);
  const searchModalOpen = useUIStore((s) => s.searchModalOpen);
  const newProjectModalOpen = useUIStore((s) => s.newProjectModalOpen);
  const renderPanelExpanded = useUIStore((s) => s.renderPanelExpanded);

  // Auto-login: ensure demo session exists on mount
  useEffect(() => {
    const store = useAuthStore.getState();
    if (!store.isAuthenticated) {
      store.loadFromStorage();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }

      if (mod && e.key === 'n') {
        e.preventDefault();
        setNewProjectModalOpen(true);
      }

      if (e.key === 'Escape') {
        if (searchModalOpen) setSearchModalOpen(false);
        if (newProjectModalOpen) setNewProjectModalOpen(false);
        if (renderPanelExpanded) setRenderPanelExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    searchModalOpen,
    newProjectModalOpen,
    renderPanelExpanded,
    setSearchModalOpen,
    setNewProjectModalOpen,
    setRenderPanelExpanded,
  ]);

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
    </div>
  );
}
