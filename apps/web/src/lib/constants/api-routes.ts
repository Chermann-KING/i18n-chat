/**
 * NestJS API base URL — consumed by BFF route handlers (server-side only).
 * Never referenced directly from client components.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Auth endpoints. */
export const API_ROUTES = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    ME: `${API_BASE_URL}/auth/me`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    BY_ID: (id: string) => `${API_BASE_URL}/users/${id}`,
  },
  LANGUAGES: {
    BASE: `${API_BASE_URL}/languages`,
    BY_CODE: (code: string) => `${API_BASE_URL}/languages/${code}`,
  },
  RECIPIENTS: {
    BASE: `${API_BASE_URL}/recipients`,
    BY_ID: (id: string) => `${API_BASE_URL}/recipients/${id}`,
    CHANNELS: (id: string) => `${API_BASE_URL}/recipients/${id}/channels`,
    CHANNEL: (id: string, channelId: string) =>
      `${API_BASE_URL}/recipients/${id}/channels/${channelId}`,
  },
  TEMPLATES: {
    BASE: `${API_BASE_URL}/templates`,
    BY_ID: (id: string) => `${API_BASE_URL}/templates/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/templates/slug/${slug}`,
    TRANSLATIONS: (id: string) => `${API_BASE_URL}/templates/${id}/translations`,
    TRANSLATION: (id: string, lang: string) =>
      `${API_BASE_URL}/templates/${id}/translations/${lang}`,
  },
  DISPATCHES: {
    BASE: `${API_BASE_URL}/dispatches`,
    BY_ID: (id: string) => `${API_BASE_URL}/dispatches/${id}`,
    PREVIEW: (id: string) => `${API_BASE_URL}/dispatches/${id}/preview`,
    CANCEL: (id: string) => `${API_BASE_URL}/dispatches/${id}/cancel`,
    CSV: `${API_BASE_URL}/dispatches/export`,
  },
} as const;
