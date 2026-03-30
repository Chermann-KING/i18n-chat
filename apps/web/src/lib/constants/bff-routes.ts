/**
 * Next.js BFF (Backend-For-Frontend) route paths.
 * These are called from client components via React Query.
 * All requests go through `/api/*` route handlers which forward to NestJS.
 */
export const BFF_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: string) => `/api/users/${id}`,
    ME: '/api/users/me',
    ME_PROFILE: '/api/users/me/profile',
    ME_PASSWORD: '/api/users/me/password',
    ME_NOTIFICATIONS: '/api/users/me/notifications',
  },
  LANGUAGES: {
    BASE: '/api/languages',
    BY_CODE: (code: string) => `/api/languages/${code}`,
  },
  RECIPIENTS: {
    BASE: '/api/recipients',
    BY_ID: (id: string) => `/api/recipients/${id}`,
    CHANNELS: (id: string) => `/api/recipients/${id}/channels`,
    CHANNEL: (id: string, channelId: string) => `/api/recipients/${id}/channels/${channelId}`,
  },
  TEMPLATES: {
    BASE: '/api/templates',
    CATEGORIES: '/api/templates/categories',
    BY_ID: (id: string) => `/api/templates/${id}`,
    BY_SLUG: (slug: string) => `/api/templates/slug/${slug}`,
    TRANSLATIONS: (id: string) => `/api/templates/${id}/translations`,
    TRANSLATION: (id: string, lang: string) => `/api/templates/${id}/translations/${lang}`,
    VARIABLES: (id: string) => `/api/templates/${id}/variables`,
    VARIABLE: (id: string, variableId: string) => `/api/templates/${id}/variables/${variableId}`,
  },
  DISPATCHES: {
    BASE: '/api/dispatches',
    BY_ID: (id: string) => `/api/dispatches/${id}`,
    MESSAGES: (id: string) => `/api/dispatches/${id}/messages`,
    PREVIEW: (id: string) => `/api/dispatches/${id}/preview`,
    CANCEL: (id: string) => `/api/dispatches/${id}/cancel`,
    CSV: '/api/dispatches/export',
  },
} as const;
