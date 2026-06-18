import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, setUnauthorizedHandler } from '../api/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = 'e2e-quickstart-auth';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): { token: string; user: AuthUser } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.user) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = readStoredAuth();
    if (stored) return { token: stored.token, user: stored.user, status: 'authenticated' };
    return { token: null, user: null, status: 'loading' };
  });

  useEffect(() => {
    if (state.status === 'loading') {
      setState({ token: null, user: null, status: 'anonymous' });
    }
  }, [state.status]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    setState({ token: res.token, user: res.user, status: 'authenticated' });
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, user: null, status: 'anonymous' });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      window.localStorage.removeItem(STORAGE_KEY);
      setState({ token: null, user: null, status: 'anonymous' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
