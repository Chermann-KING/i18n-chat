import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * next-intl middleware — detects the locale from the URL prefix,
 * the `Accept-Language` header, and the `NEXT_LOCALE` cookie (in that order),
 * then redirects or rewrites accordingly.
 *
 * The matcher excludes Next.js internals and static assets.
 */
export default createMiddleware(routing);

export const config = {
  // Exclude Next.js internals, static assets, and BFF API routes from locale detection.
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
};
