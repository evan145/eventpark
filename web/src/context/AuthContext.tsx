import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getToken, setToken } from '../api/client';
import type { User } from '../types';

interface JwtPayload {
  sub?: string;
  user_id?: number;
  email?: string;
  role?: 'guest' | 'host' | 'admin';
  exp?: number;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthed: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => undefined,
  logout: () => undefined,
  isAuthed: false,
});

function decode(token: string): User | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (!payload.email || !payload.role) return null;
    return {
      id: payload.user_id ?? Number(payload.sub ?? 0),
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(() => {
    const t = getToken();
    return t ? decode(t) : null;
  });

  useEffect(() => {
    if (token) {
      const u = decode(token);
      if (!u) {
        setToken(null);
        setTokenState(null);
        setUser(null);
      } else {
        setUser(u);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, login, logout, isAuthed: !!user }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
