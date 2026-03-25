import { create } from 'zustand';
import { api } from '../lib/api';

interface Project {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  shotCount: number;
  status: 'active' | 'archived' | 'draft';
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await api.get<Project[]>('/projects');
      set({ projects, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch projects', isLoading: false });
    }
  },

  createProject: async (name: string, description: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.post<Project>('/projects', { name, description });
      set((state) => ({
        projects: [project, ...state.projects],
        activeProject: project,
        isLoading: false,
      }));
      return project;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create project', isLoading: false });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ error: null });
    try {
      await api.delete(`/projects/${projectId}`);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        activeProject:
          state.activeProject?.id === projectId ? null : state.activeProject,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete project' });
      throw error;
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
  },
}));
