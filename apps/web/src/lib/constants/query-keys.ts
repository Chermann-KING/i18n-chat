/**
 * React Query cache key factories.
 * Using factory functions ensures consistent key shapes and enables
 * precise cache invalidation (e.g. `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recipients.all() })`).
 */
export const QUERY_KEYS = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    all: () => ['users'] as const,
    byId: (id: string) => ['users', id] as const,
  },
  languages: {
    all: () => ['languages'] as const,
    byCode: (code: string) => ['languages', code] as const,
  },
  recipients: {
    all: (filters?: Record<string, unknown>) => ['recipients', filters] as const,
    byId: (id: string) => ['recipients', id] as const,
  },
  templates: {
    all: (filters?: Record<string, unknown>) => ['templates', filters] as const,
    byId: (id: string) => ['templates', id] as const,
    bySlug: (slug: string) => ['templates', 'slug', slug] as const,
  },
  dispatches: {
    all: (filters?: Record<string, unknown>) => ['dispatches', filters] as const,
    byId: (id: string) => ['dispatches', id] as const,
    preview: (id: string) => ['dispatches', id, 'preview'] as const,
  },
} as const;
