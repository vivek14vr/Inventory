"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api/client";
import { refreshAccessToken } from "@/lib/api/authSession";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import {
  clearAuthTokens,
  getAccessToken,
  getDashboardPath,
  setAuthTokens,
} from "@/lib/auth/token";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.auth.me(token);
      setUser(me);
    } catch {
      clearAuthTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setAuthTokens({
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      refreshToken: result.refreshToken,
      refreshTokenExpiresIn: result.refreshTokenExpiresIn,
    });
    setUser(result.user);
    const dest = getDashboardPath(result.user.role, result.user.permissions);
    window.location.assign(dest);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* session may already be invalid */
    }
    clearAuthTokens();
    setUser(null);
    window.location.assign(AUTH_ROUTES.login);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
