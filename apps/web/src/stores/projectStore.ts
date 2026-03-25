import { create } from 'zustand';
import type { Project, WorldBible, BrandKit, User } from '@/types';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface ProjectState {
  activeProject: Project | null;
  projects: Project[];
  worldBible: WorldBible | null;
  brandKit: BrandKit | null;
  members: User[];
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface ProjectActions {
  setActiveProject: (project: Project | null) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateWorldBible: (worldBible: WorldBible) => void;
  updateBrandKit: (brandKit: BrandKit) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  // State
  activeProject: null,
  projects: [],
  worldBible: null,
  brandKit: null,
  members: [],

  // Actions
  setActiveProject: (project) =>
    set({
      activeProject: project,
      worldBible: project?.worldBible ?? null,
      brandKit: project?.brandKit ?? null,
      members: project?.members ?? [],
    }),

  updateProject: (id, patch) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
      activeProject:
        state.activeProject?.id === id
          ? { ...state.activeProject, ...patch }
          : state.activeProject,
    })),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    })),

  updateWorldBible: (worldBible) =>
    set((state) => ({
      worldBible,
      activeProject: state.activeProject
        ? { ...state.activeProject, worldBible }
        : null,
    })),

  updateBrandKit: (brandKit) =>
    set((state) => ({
      brandKit,
      activeProject: state.activeProject
        ? { ...state.activeProject, brandKit }
        : null,
    })),
}));
