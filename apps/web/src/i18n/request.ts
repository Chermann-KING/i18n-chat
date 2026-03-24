import { getRequestConfig } from 'next-intl/server';

/** Supported staff-interface locale codes. */
export const SUPPORTED_LOCALES = ['fr', 'nl', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * next-intl server configuration.
 * Loads the message file matching the resolved locale.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'fr';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)) as Record<string, unknown>,
  };
});
