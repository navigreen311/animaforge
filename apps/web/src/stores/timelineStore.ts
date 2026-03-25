import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface TimelineState {
  playhead: number;
  zoomLevel: number;
  trackVisibility: Record<string, boolean>;
  selectedShotIds: string[];
  isPlaying: boolean;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface TimelineActions {
  setPlayhead: (time: number) => void;
  setZoom: (level: number) => void;
  toggleTrack: (trackId: string) => void;
  setSelection: (ids: string[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useTimelineStore = create<TimelineState & TimelineActions>(
  (set) => ({
    // State
    playhead: 0,
    zoomLevel: 100,
    trackVisibility: {},
    selectedShotIds: [],
    isPlaying: false,

    // Actions
    setPlayhead: (time) => set({ playhead: time }),

    setZoom: (level) => set({ zoomLevel: Math.max(10, Math.min(400, level)) }),

    toggleTrack: (trackId) =>
      set((state) => ({
        trackVisibility: {
          ...state.trackVisibility,
          [trackId]: !state.trackVisibility[trackId],
        },
      })),

    setSelection: (ids) => set({ selectedShotIds: ids }),

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  }),
);
