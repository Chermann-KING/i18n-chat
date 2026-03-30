import { cookies } from 'next/headers';
import { API_ROUTES } from './constants/api-routes';

/**
 * Server-side API client used exclusively by Next.js BFF route handlers.
 * Reads the `access_token` from the HttpOnly cookie jar and forwards it
 * as a `Bearer` header to the NestJS API.
 *
 * Implements silent token refresh: on a 401 response the client calls the
 * NestJS refresh endpoint, writes new cookies, then retries the original
 * request once. If the refresh also fails, an `ApiError(401)` is thrown
 * so the BFF can return 401 to the browser and trigger a login redirect.
 *
 * Never import this module in client components — it relies on `next/headers`.
 */

/** Structured error from the NestJS API. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Name of the HttpOnly cookie that stores the JWT access token. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Name of the HttpOnly cookie that stores the JWT refresh token. */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE = 4 * 60 * 60;       // 4 hours
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Calls the NestJS refresh endpoint using the stored refresh token cookie.
 * On success, writes fresh access + refresh cookies and returns the new
 * access token. Returns `null` when the session has truly expired.
 */
async function attemptRefresh(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const res = await fetch(API_ROUTES.AUTH.REFRESH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const secure = process.env.NODE_ENV === 'production';

  cookieStore.set(ACCESS_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return data.accessToken;
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const buildHeaders = (token?: string) => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  });

  let response = await fetch(url, { ...options, headers: buildHeaders(accessToken) });

  // Silent refresh on 401 — retry once with a fresh token.
  if (response.status === 401) {
    const newToken = await attemptRefresh();
    if (!newToken) {
      throw new ApiError(401, 'Session expired');
    }
    accessToken = newToken;
    response = await fetch(url, { ...options, headers: buildHeaders(accessToken) });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, text);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

/** GET request to the NestJS API (server-side). */
export const apiGet = <T>(url: string, options?: Omit<RequestInit, 'method'>) =>
  apiRequest<T>(url, { ...options, method: 'GET' });

/** POST request to the NestJS API (server-side). */
export const apiPost = <T>(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>,
) => apiRequest<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) });

/** PUT request to the NestJS API (server-side). */
export const apiPut = <T>(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>,
) => apiRequest<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) });

/** PATCH request to the NestJS API (server-side). */
export const apiPatch = <T>(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>,
) => apiRequest<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) });

/** DELETE request to the NestJS API (server-side). */
export const apiDelete = <T = void>(url: string, options?: Omit<RequestInit, 'method'>) =>
  apiRequest<T>(url, { ...options, method: 'DELETE' });
