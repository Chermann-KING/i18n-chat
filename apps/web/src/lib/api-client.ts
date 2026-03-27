import { cookies } from 'next/headers';

/**
 * Server-side API client used exclusively by Next.js BFF route handlers.
 * Reads the `access_token` from the HttpOnly cookie jar and forwards it
 * as a `Bearer` header to the NestJS API.
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

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

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

/** PATCH request to the NestJS API (server-side). */
export const apiPatch = <T>(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>,
) => apiRequest<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) });

/** DELETE request to the NestJS API (server-side). */
export const apiDelete = <T = void>(url: string, options?: Omit<RequestInit, 'method'>) =>
  apiRequest<T>(url, { ...options, method: 'DELETE' });
