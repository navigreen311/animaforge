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

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3003';
      const res = await fetch(`${AUTH_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error || 'Login failed');
      }

      const data = await res.json();
      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        tier: data.user.tier || 'free',
      };

      persistAuth(user, data.token);
      set({
        user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err instanceof Error ? err : new Error('Login failed');
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3003';
      const res = await fetch(`${AUTH_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(err.error || 'Registration failed');
      }

      const data = await res.json();
      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        tier: data.user.tier || 'free',
      };

      persistAuth(user, data.token);
      set({
        user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err instanceof Error ? err : new Error('Registration failed');
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
