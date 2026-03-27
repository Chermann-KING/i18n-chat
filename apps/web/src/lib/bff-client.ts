/**
 * Lightweight fetch wrapper for client-side calls to the Next.js BFF `/api/*` routes.
 * Automatically includes credentials (HttpOnly cookies) and handles JSON (de)serialization.
 * Throws a `BffError` on non-2xx responses.
 */

/** Structured error from the BFF layer. */
export class BffError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BffError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(path, {
    ...rest,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new BffError(response.status, text);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

/** HTTP GET — fetches a resource from the BFF. */
export const bffGet = <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
  request<T>(path, { ...options, method: 'GET' });

/** HTTP POST — creates a resource via the BFF. */
export const bffPost = <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'body'>) =>
  request<T>(path, { ...options, method: 'POST', body });

/** HTTP PATCH — partially updates a resource via the BFF. */
export const bffPatch = <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'body'>) =>
  request<T>(path, { ...options, method: 'PATCH', body });

/** HTTP DELETE — removes a resource via the BFF. */
export const bffDelete = <T = void>(path: string, options?: Omit<RequestOptions, 'body'>) =>
  request<T>(path, { ...options, method: 'DELETE' });
