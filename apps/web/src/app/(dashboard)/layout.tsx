'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/sidebar/Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/stores/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSearchModalOpen = useUIStore((s) => s.setSearchModalOpen);
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);
  const setRenderPanelExpanded = useUIStore((s) => s.setRenderPanelExpanded);
  const searchModalOpen = useUIStore((s) => s.searchModalOpen);
  const newProjectModalOpen = useUIStore((s) => s.newProjectModalOpen);
  const renderPanelExpanded = useUIStore((s) => s.renderPanelExpanded);

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
        />
      </div>
    );
  }

  // Not authenticated — will redirect, render nothing
  if (!isAuthenticated) {
    return null;
  }

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
