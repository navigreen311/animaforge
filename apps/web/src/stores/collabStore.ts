import { create } from 'zustand';

export interface PresenceEntry {
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  activeShotId?: string;
  lastSeen: number;
}

interface CollabState {
  presenceMap: Map<string, PresenceEntry>;
  isConnected: boolean;
}

interface CollabActions {
  updatePresence: (userId: string, entry: PresenceEntry) => void;
  removeUser: (userId: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useCollabStore = create<CollabState & CollabActions>((set) => ({
  presenceMap: new Map(),
  isConnected: false,

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
