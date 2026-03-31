/**
 * next-intl global type augmentation.
 *
 * Narrows the `Locale` type used throughout next-intl (LayoutConfig,
 * PageConfig, getTranslations, etc.) to our concrete union so that
 * `params.locale` is typed as `SupportedLocale` everywhere — no casts
 * needed in layouts or pages.
 *
 * @see https://next-intl.dev/docs/workflows/typescript
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: import('@/i18n/routing').SupportedLocale;
  }
}
