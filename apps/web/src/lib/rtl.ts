/**
 * ISO 639-1 language codes whose scripts run right-to-left.
 * Extend this set when new RTL languages are added to the platform.
 */
const RTL_CODES = new Set(['ar', 'he', 'fa', 'ur', 'dv', 'ku', 'ps', 'sd', 'ug', 'yi']);

/**
 * Returns `true` when the given ISO 639-1 language code uses a
 * right-to-left script (Arabic, Hebrew, Persian, Urdu, …).
 *
 * @param languageCode - ISO 639-1 code, e.g. `'ar'`, `'fr'`.
 */
export function isRtl(languageCode: string): boolean {
  return RTL_CODES.has(languageCode.toLowerCase().split('-')[0]);
}

/**
 * Returns the HTML `dir` attribute value for the given language code.
 *
 * @param languageCode - ISO 639-1 code.
 */
export function dirAttr(languageCode: string): 'rtl' | 'ltr' {
  return isRtl(languageCode) ? 'rtl' : 'ltr';
}
