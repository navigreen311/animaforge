import { create } from 'zustand';
import type { Shot, SceneGraph } from '@/types';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface ShotState {
  shots: Shot[];
  activeShot: Shot | null;
  sceneGraph: SceneGraph | null;
  isDirty: boolean;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface ShotActions {
  setShots: (shots: Shot[]) => void;
  setActiveShot: (shot: Shot | null) => void;
  updateSceneGraph: (sceneGraph: SceneGraph) => void;
  addShot: (shot: Shot) => void;
  removeShot: (id: string) => void;
  reorderShots: (orderedIds: string[]) => void;
  markDirty: () => void;
  markClean: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useShotStore = create<ShotState & ShotActions>((set) => ({
  // State
  shots: [],
  activeShot: null,
  sceneGraph: null,
  isDirty: false,

  // Actions
  setShots: (shots) => set({ shots }),

  setActiveShot: (shot) => set({ activeShot: shot }),

  updateSceneGraph: (sceneGraph) => set({ sceneGraph, isDirty: true }),

  addShot: (shot) =>
    set((state) => ({ shots: [...state.shots, shot], isDirty: true })),

  removeShot: (id) =>
    set((state) => ({
      shots: state.shots.filter((s) => s.id !== id),
      activeShot: state.activeShot?.id === id ? null : state.activeShot,
      isDirty: true,
    })),

  reorderShots: (orderedIds) =>
    set((state) => {
      const lookup = new Map(state.shots.map((s) => [s.id, s]));
      const reordered = orderedIds
        .map((id, index) => {
          const shot = lookup.get(id);
          return shot ? { ...shot, number: index + 1 } : undefined;
        })
        .filter((s): s is Shot => s !== undefined);
      return { shots: reordered, isDirty: true };
    }),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
