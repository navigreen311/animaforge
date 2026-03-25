import { create } from 'zustand';
import type { GenerationJob, JobStatus, GenerationStage } from '@/types';

export interface JobEntry {
  status: JobStatus;
  progress: number;
  stage: GenerationStage;
  outputUrl?: string;
  error?: string;
}

interface GenerationState {
  activeJobs: Map<string, JobEntry>;
  results: GenerationJob[];
}

interface GenerationActions {
  addJob: (id: string, entry: JobEntry) => void;
  updateJobProgress: (id: string, progress: number, stage: GenerationStage) => void;
  completeJob: (id: string, outputUrl: string) => void;
  failJob: (id: string, error: string) => void;
  cancelJob: (id: string) => void;
  clearResults: () => void;
}

export const useGenerationStore = create<GenerationState & GenerationActions>(
  (set) => ({
    activeJobs: new Map(),
    results: [],

    addJob: (id, entry) =>
      set((state) => {
        const next = new Map(state.activeJobs);
        next.set(id, entry);
        return { activeJobs: next };
      }),

    updateJobProgress: (id, progress, stage) =>
      set((state) => {
        const next = new Map(state.activeJobs);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, progress, stage, status: 'running' });
        }
        return { activeJobs: next };
      }),

    completeJob: (id, outputUrl) =>
      set((state) => {
        const next = new Map(state.activeJobs);
        const existing = next.get(id);
        if (existing) {
          next.set(id, {
            ...existing,
            status: 'complete',
            progress: 100,
            stage: 'complete',
            outputUrl,
          });
        }
        return { activeJobs: next };
      }),

    failJob: (id, error) =>
      set((state) => {
        const next = new Map(state.activeJobs);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, status: 'failed', stage: 'failed', error });
        }
        return { activeJobs: next };
      }),

    cancelJob: (id) =>
      set((state) => {
        const next = new Map(state.activeJobs);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, status: 'cancelled' });
        }
        return { activeJobs: next };
      }),

    clearResults: () => set({ results: [] }),
  }),
);
