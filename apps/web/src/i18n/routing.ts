import { defineRouting } from 'next-intl/routing';

/** Supported staff-interface locales. */
export const SUPPORTED_LOCALES = ['fr', 'nl', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * next-intl routing configuration.
 * All pages live under `/[locale]/`; `fr` is the default and is not prefixed in URLs.
 */
export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: 'fr' satisfies SupportedLocale,
});
