import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Presence Entry                                                     */
/* ------------------------------------------------------------------ */

export interface PresenceEntry {
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  activeShotId?: string;
  lastSeen: number;
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface CollabState {
  presenceMap: Map<string, PresenceEntry>;
  isConnected: boolean;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface CollabActions {
  updatePresence: (userId: string, entry: PresenceEntry) => void;
  removeUser: (userId: string) => void;
  setConnected: (connected: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useCollabStore = create<CollabState & CollabActions>((set) => ({
  // State
  presenceMap: new Map(),
  isConnected: false,

  // Actions
  updatePresence: (userId, entry) =>
    set((state) => {
      const next = new Map(state.presenceMap);
      next.set(userId, entry);
      return { presenceMap: next };
    }),

  removeUser: (userId) =>
    set((state) => {
      const next = new Map(state.presenceMap);
      next.delete(userId);
      return { presenceMap: next };
    }),

  setConnected: (connected) => set({ isConnected: connected }),
}));
