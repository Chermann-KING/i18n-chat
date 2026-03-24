/**
 * Re-exports the Prisma client instance.
 * Import from `@i18n-chat/database` instead of directly from `@prisma/client`
 * to centralise the client configuration.
 */
export { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';
