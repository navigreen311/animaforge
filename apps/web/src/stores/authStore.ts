import { create } from 'zustand';
import { setToken, removeToken } from '@/lib/auth';

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

/**
 * The cookie the Next middleware reads.
 *
 * Route protection runs on the server, before the page renders, and the server
 * cannot see localStorage. So the token is mirrored into a cookie -- that is
 * the only copy `middleware.ts` can check.
 *
 * Not HttpOnly: this is written by client code and read by client code as well
 * as the middleware, and marking it HttpOnly would simply stop the browser from
 * accepting it here. The real protection is that the token is signed and
 * verified server-side (#82); the cookie is a transport, not a trust anchor.
 * `SameSite=Lax` keeps it off cross-site requests.
 */
export const AUTH_COOKIE = 'animaforge_token';

function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function persistAuth(user: AuthUser, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  // The console's API layer reads the bearer token through lib/auth's own key,
  // which this store was not writing -- so every proxied request went out
  // unauthenticated even while the store said the user was signed in.
  setToken(token);
  setAuthCookie(token);
}

function clearPersistedAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  removeToken();
  clearAuthCookie();
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
      // Re-mirror on every load: a session persisted before the cookie existed
      // would otherwise be invisible to the middleware and bounce the user to
      // login despite being signed in.
      persistAuth(persisted.user, persisted.token);
      set({
        user: persisted.user,
        token: persisted.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    // No session. This used to fabricate one -- a 'user_demo' account with the
    // token 'demo_token_animaforge' -- which is why the dashboard was reachable
    // signed out and why route protection had nothing to protect (#80). That
    // token was also not a JWT, so since #82 every API call made with it is
    // rejected: the console looked signed in and could load nothing.
    clearPersistedAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
