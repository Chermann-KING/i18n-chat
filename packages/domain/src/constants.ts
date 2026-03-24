/**
 * ISO 639-1 code of the language used as a fallback when no translation
 * exists for a recipient's preferred language.
 */
export const FALLBACK_LANGUAGE_CODE = 'en' as const;

/**
 * Number of days after which anonymous recipient targets are purged (GDPR).
 */
export const ANONYMOUS_TARGET_TTL_DAYS = 30 as const;

/**
 * Maximum number of recipients allowed in a single dispatch.
 */
export const MAX_RECIPIENTS_PER_DISPATCH = 10_000 as const;
