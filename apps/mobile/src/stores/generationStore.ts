import { create } from 'zustand';
import { api } from '../lib/api';

type JobStatus = 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled';

interface GenerationJob {
  id: string;
  projectId: string;
  shotId: string;
  type: 'video' | 'avatar' | 'style';
  status: JobStatus;
  progress: number;
  stage?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
}

interface GenerationResult {
  jobId: string;
  type: 'video' | 'avatar' | 'style';
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

interface GenerationState {
  activeJobs: GenerationJob[];
  results: GenerationResult[];
  isGenerating: boolean;

  generate: (params: {
    projectId: string;
    shotId: string;
    type: 'video' | 'avatar' | 'style';
    prompt?: string;
    settings?: Record<string, unknown>;
  }) => Promise<GenerationJob>;

  cancel: (jobId: string) => Promise<void>;
  pollJob: (jobId: string) => Promise<GenerationJob>;
  clearResults: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  activeJobs: [],
  results: [],
  isGenerating: false,

  generate: async (params) => {
    set({ isGenerating: true });
    try {
      const job = await api.post<GenerationJob>(
        `/projects/${params.projectId}/shots/${params.shotId}/generate`,
        {
          type: params.type,
          prompt: params.prompt,
          settings: params.settings,
        },
      );

      set((state) => ({
        activeJobs: [...state.activeJobs, job],
        isGenerating: state.activeJobs.length > 0,
      }));

      return job;
    } catch (error) {
      set({ isGenerating: get().activeJobs.length > 0 });
      throw error;
    }
  },

  cancel: async (jobId: string) => {
    try {
      await api.post(`/generations/${jobId}/cancel`);
      set((state) => ({
        activeJobs: state.activeJobs.map((j) =>
          j.id === jobId ? { ...j, status: 'cancelled' as JobStatus } : j,
        ),
        isGenerating: state.activeJobs.filter(
          (j) => j.id !== jobId && (j.status === 'queued' || j.status === 'processing'),
        ).length > 0,
      }));
    } catch (error) {
      throw error;
    }
  },

  pollJob: async (jobId: string) => {
    const job = await api.get<GenerationJob>(`/generations/${jobId}`);

    set((state) => {
      const updatedJobs = state.activeJobs.map((j) =>
        j.id === jobId ? job : j,
      );

      const newResults = [...state.results];
      if (job.status === 'complete' && job.resultUrl) {
        const exists = newResults.some((r) => r.jobId === jobId);
        if (!exists) {
          newResults.push({
            jobId: job.id,
            type: job.type,
            url: job.resultUrl,
            thumbnailUrl: job.thumbnailUrl,
          });
        }
      }

      return {
        activeJobs: updatedJobs,
        results: newResults,
        isGenerating: updatedJobs.some(
          (j) => j.status === 'queued' || j.status === 'processing',
        ),
      };
    });

    return job;
  },

  clearResults: () => {
    set({ results: [] });
  },
}));
