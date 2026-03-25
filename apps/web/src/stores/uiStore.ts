import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: number;
}

export interface ModalEntry {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

interface UiState {
  sidebarOpen: boolean;
  modalStack: ModalEntry[];
  theme: 'dark' | 'light';
  notifications: Notification[];
}

interface UiActions {
  toggleSidebar: () => void;
  pushModal: (modal: ModalEntry) => void;
  popModal: () => void;
  addNotification: (notification: Notification) => void;
  dismissNotification: (id: string) => void;
}

export const useUiStore = create<UiState & UiActions>((set) => ({
  sidebarOpen: true,
  modalStack: [],
  theme: 'dark',
  notifications: [],

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
