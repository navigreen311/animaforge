import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'free' | 'pro' | 'enterprise';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'animaforge_auth';

function persistAuth(user: AuthUser, token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }
}

function clearPersistedAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getPersistedAuth(): { user: AuthUser; token: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.user && parsed?.token) return parsed;
    return null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    try {
      // Simulated API call — replace with real endpoint
      const mockUser: AuthUser = {
        id: `user_${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        tier: 'free',
      };
      const mockToken = `mock_token_${Date.now()}`;

      persistAuth(mockUser, mockToken);
      set({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error('Login failed');
    }
  },

  register: async (email: string, _password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      // Simulated API call — replace with real endpoint
      const mockUser: AuthUser = {
        id: `user_${Date.now()}`,
        email,
        displayName,
        tier: 'free',
      };
      const mockToken = `mock_token_${Date.now()}`;

      persistAuth(mockUser, mockToken);
      set({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error('Registration failed');
    }
  },

  logout: () => {
    clearPersistedAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadFromStorage: () => {
    const persisted = getPersistedAuth();
    if (persisted) {
      set({
        user: persisted.user,
        token: persisted.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
