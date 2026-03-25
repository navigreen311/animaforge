import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName: string;
  tier: 'free' | 'pro' | 'studio';
  credits: number;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const [token, userJson] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (token && userJson) {
          const user = JSON.parse(userJson) as User;
          setState({ user, token, isLoading: false, isAuthenticated: true });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>(
      '/auth/login',
      { email, password },
      { authenticated: false },
    );

    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user)),
    ]);

    setState({
      user: response.user,
      token: response.token,
      isLoading: false,
      isAuthenticated: true,
    });

    return response.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await api.post<{ token: string; user: User }>(
        '/auth/register',
        { email, password, displayName },
        { authenticated: false },
      );

      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user)),
      ]);

      setState({
        user: response.user,
        token: response.token,
        isLoading: false,
        isAuthenticated: true,
      });

      return response.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);

    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.get<User>('/auth/me');
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      setState((prev) => ({ ...prev, user }));
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
      }
      throw error;
    }
  }, [logout]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };
}
