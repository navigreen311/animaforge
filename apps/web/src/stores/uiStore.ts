import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Notification                                                       */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export interface ModalEntry {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface UiState {
  sidebarOpen: boolean;
  modalStack: ModalEntry[];
  theme: 'dark' | 'light';
  notifications: Notification[];
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface UiActions {
  toggleSidebar: () => void;
  pushModal: (modal: ModalEntry) => void;
  popModal: () => void;
  addNotification: (notification: Notification) => void;
  dismissNotification: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useUiStore = create<UiState & UiActions>((set) => ({
  // State
  sidebarOpen: true,
  modalStack: [],
  theme: 'dark',
  notifications: [],

  // Actions
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  pushModal: (modal) =>
    set((state) => ({ modalStack: [...state.modalStack, modal] })),

  popModal: () =>
    set((state) => ({ modalStack: state.modalStack.slice(0, -1) })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
