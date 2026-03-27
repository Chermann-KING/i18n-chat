import { getRequestConfig } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import { routing } from './routing';

/**
 * next-intl server configuration.
 * Loads the message file matching the resolved locale from the routing config.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const mod = await import(`../../messages/${locale}.json`);
  const messages = (mod.default ?? mod) as AbstractIntlMessages;

  return { locale, messages };
});
