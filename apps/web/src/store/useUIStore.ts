import { create } from 'zustand';
import type { ProjectStatus, SortOption, ViewMode } from '@/lib/types';

interface UIState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  statusFilter: ProjectStatus | 'all';
  setStatusFilter: (s: ProjectStatus | 'all') => void;
  sortOption: SortOption;
  setSortOption: (s: SortOption) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  searchModalOpen: boolean;
  setSearchModalOpen: (v: boolean) => void;

  renderPanelExpanded: boolean;
  setRenderPanelExpanded: (v: boolean) => void;

  newProjectModalOpen: boolean;
  setNewProjectModalOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  statusFilter: 'all',
  setStatusFilter: (s) => set({ statusFilter: s }),
  sortOption: 'recent',
  setSortOption: (s) => set({ sortOption: s }),
  viewMode: (typeof window !== 'undefined' && (localStorage.getItem('animaforge-viewMode') as 'grid' | 'list')) || 'grid',
  setViewMode: (m) => {
    if (typeof window !== 'undefined') localStorage.setItem('animaforge-viewMode', m);
    set({ viewMode: m });
  },
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  searchModalOpen: false,
  setSearchModalOpen: (v) => set({ searchModalOpen: v }),

  renderPanelExpanded: false,
  setRenderPanelExpanded: (v) => set({ renderPanelExpanded: v }),

  newProjectModalOpen: false,
  setNewProjectModalOpen: (v) => set({ newProjectModalOpen: v }),
}));
