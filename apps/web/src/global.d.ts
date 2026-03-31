/**
 * next-intl global type augmentation.
 *
 * Narrows the `Locale` type used throughout next-intl (LayoutConfig,
 * PageConfig, getTranslations, etc.) to our concrete union so that
 * `params.locale` is typed as `SupportedLocale` everywhere — no casts
 * needed in layouts or pages.
 *
 * The `export {}` is required to make this file a module; without it
 * TypeScript treats `declare module 'next-intl'` as an ambient replacement
 * that wipes out all of next-intl's own exports.
 *
 * @see https://next-intl.dev/docs/workflows/typescript
 */
export {};

declare module 'next-intl' {
  interface AppConfig {
    Locale: import('@/i18n/routing').SupportedLocale;
  }
}
