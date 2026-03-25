import { create } from 'zustand';

export type StyleMode = 'realistic' | 'anime' | 'cartoon' | 'cel' | 'pixel';
export type AvatarJobStatus = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';

export interface ReconstructionProgress {
  step: number;
  totalSteps: number;
  stepName: string;
  percent: number;
}

export interface AvatarJob {
  id: string;
  characterId: string;
  photos: string[];
  styleMode: StyleMode;
  status: AvatarJobStatus;
  progress: ReconstructionProgress;
  qualityScore?: number;
  outputUrl?: string;
  error?: string;
  createdAt: number;
}

interface AvatarState {
  avatarJobs: AvatarJob[];
  activeAvatar: string | null;
  reconstructionProgress: ReconstructionProgress;
  previewUrl: string | null;
}

interface AvatarActions {
  startReconstruction: (characterId: string, photos: string[], styleMode: StyleMode) => void;
  updateProgress: (data: Partial<ReconstructionProgress>) => void;
  setActiveAvatar: (id: string | null) => void;
  cancelJob: (id: string) => void;
}

const PIPELINE_STEPS = [
  'Multi-view alignment',
  'Volumetric reconstruction',
  'Mesh extraction',
  'Texture baking',
  'FLAME fitting',
  'Body estimation',
  'Quality validation',
] as const;

const initialProgress: ReconstructionProgress = {
  step: 0,
  totalSteps: 7,
  stepName: '',
  percent: 0,
};

export const useAvatarStore = create<AvatarState & AvatarActions>((set) => ({
  avatarJobs: [],
  activeAvatar: null,
  reconstructionProgress: initialProgress,
  previewUrl: null,

  startReconstruction: (characterId, photos, styleMode) => {
    const id = `avatar-${Date.now()}`;
    const progress: ReconstructionProgress = {
      step: 1,
      totalSteps: 7,
      stepName: PIPELINE_STEPS[0],
      percent: 0,
    };

    const job: AvatarJob = {
      id,
      characterId,
      photos,
      styleMode,
      status: 'running',
      progress,
      createdAt: Date.now(),
    };

    set((state) => ({
      avatarJobs: [...state.avatarJobs, job],
      activeAvatar: id,
      reconstructionProgress: progress,
      previewUrl: null,
    }));
  },

  updateProgress: (data) =>
    set((state) => {
      const merged: ReconstructionProgress = { ...state.reconstructionProgress, ...data };
      if (data.step !== undefined && !data.stepName) {
        merged.stepName = PIPELINE_STEPS[data.step - 1] ?? '';
      }

      const updatedJobs = state.avatarJobs.map((job) => {
        if (job.id !== state.activeAvatar) return job;
        const isDone = merged.step === merged.totalSteps && merged.percent >= 100;
        return {
          ...job,
          progress: merged,
          status: isDone ? ('complete' as const) : job.status,
        };
      });

      return { reconstructionProgress: merged, avatarJobs: updatedJobs };
    }),

  setActiveAvatar: (id) =>
    set((state) => {
      const job = state.avatarJobs.find((j) => j.id === id);
      return {
        activeAvatar: id,
        reconstructionProgress: job?.progress ?? initialProgress,
        previewUrl: job?.outputUrl ?? null,
      };
    }),

  cancelJob: (id) =>
    set((state) => ({
      avatarJobs: state.avatarJobs.map((job) =>
        job.id === id ? { ...job, status: 'cancelled' as const } : job
      ),
      activeAvatar: state.activeAvatar === id ? null : state.activeAvatar,
      reconstructionProgress:
        state.activeAvatar === id ? initialProgress : state.reconstructionProgress,
    })),
}));
