import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "./constants";
import { getDefaultAppPath } from "./permissions";
import type { PermissionGrant } from "./permissions";

export type AuthTokenPair = {
  accessToken: string;
  accessTokenExpiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
};

export function setAuthTokens(tokens: AuthTokenPair): void {
  if (typeof window === "undefined") return;

  const accessMaxAge = tokens.accessTokenExpiresIn ?? 15 * 60;
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}; path=/; max-age=${accessMaxAge}; SameSite=Lax`;

  if (tokens.refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
  }
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

/** @deprecated Use getAccessToken */
export function getClientToken(): string | null {
  return getAccessToken();
}

/** @deprecated Use setAuthTokens */
export function setAuthToken(token: string): void {
  setAuthTokens({ accessToken: token });
}

/** @deprecated Use clearAuthTokens */
export function clearAuthToken(): void {
  clearAuthTokens();
}

export function getDashboardPath(
  role: string,
  permissions?: PermissionGrant[]
): string {
  return getDefaultAppPath(role, permissions);
}
