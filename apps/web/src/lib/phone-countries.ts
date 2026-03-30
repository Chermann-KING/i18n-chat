/**
 * Phone-number format configuration used by PhoneInput.
 *
 * Formatting is digit-group based: each entry in `groups` is the number of
 * consecutive digits in that segment; segments are joined by spaces.
 *
 * Example: groups [4, 2, 2, 2] + digits "0470123456" → "0470 12 34 56"
 */
export interface PhoneFormat {
  /**
   * Tested against the raw digits the user has typed so far.
   * The first matching format wins; use `null` as a catch-all fallback.
   */
  readonly detect: RegExp | null;
  /** Digit-group sizes that drive the spacing mask. */
  readonly groups: readonly number[];
  /** Total digit count for this format — input is blocked beyond this. */
  readonly total: number;
}

/** Full country configuration entry. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 — drives `Intl.DisplayNames`. */
  readonly iso: string;
  /** ITU dial code including leading `+`. */
  readonly dialCode: string;
  /** Emoji flag. */
  readonly flag: string;
  /**
   * Ordered list of format rules.
   * The first rule whose `detect` regex matches the raw digits wins.
   * The null-detect fallback must be last.
   */
  readonly formats: readonly PhoneFormat[];
  /** Placeholder shown when the field is empty (uses primary format). */
  readonly placeholder: string;
}

/** Convenience builder — computes `total` from the groups array. */
function f(detect: RegExp | null, groups: number[]): PhoneFormat {
  return { detect, groups, total: groups.reduce((s, n) => s + n, 0) };
}

/**
 * Supported countries.
 * Belgium is first and is the default selection.
 *
 * To add a new country: append an entry following the same structure.
 */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    iso: 'BE',
    dialCode: '+32',
    flag: '🇧🇪',
    formats: [
      // Mobile:         04XX XX XX XX  — 10 digits
      f(/^04/, [4, 2, 2, 2]),
      // Brussels/Antwerp: 02/03 XXX XX XX — 9 digits
      f(/^0[23]/, [2, 3, 2, 2]),
      // Other landlines: 0XX XX XX XX  — 9 digits
      f(null, [3, 2, 2, 2]),
    ],
    placeholder: '0470 12 34 56',
  },
  {
    iso: 'FR',
    dialCode: '+33',
    flag: '🇫🇷',
    // All French numbers: 0X XX XX XX XX — 10 digits
    formats: [f(null, [2, 2, 2, 2, 2])],
    placeholder: '06 12 34 56 78',
  },
  {
    iso: 'NL',
    dialCode: '+31',
    flag: '🇳🇱',
    formats: [
      // Mobile 06 XXXXXXXX — 10 digits
      f(/^06/, [2, 4, 4]),
      // Landline 0XX XXX XXXX — 10 digits
      f(null, [3, 3, 4]),
    ],
    placeholder: '06 1234 5678',
  },
  {
    iso: 'LU',
    dialCode: '+352',
    flag: '🇱🇺',
    formats: [
      // Mobile 6X1 XXX XXX — 9 digits
      f(/^6/, [3, 3, 3]),
      // Landline XX XXXX — 6 digits (short LU numbers)
      f(null, [2, 4]),
    ],
    placeholder: '621 000 000',
  },
  {
    iso: 'DE',
    dialCode: '+49',
    flag: '🇩🇪',
    formats: [
      // Mobile 015X/016X/017X XXXXXXXX — 11 digits
      f(/^01[5-7]/, [4, 3, 4]),
      // Other mobile/landline — 11 digits
      f(null, [4, 3, 4]),
    ],
    placeholder: '0151 000 0000',
  },
  {
    iso: 'GB',
    dialCode: '+44',
    flag: '🇬🇧',
    formats: [
      // Mobile 07XXX XXXXXX — 11 digits
      f(/^07/, [5, 6]),
      // London 020 XXXX XXXX — 11 digits
      f(/^020/, [3, 4, 4]),
      // Other landlines 01XXX XXXXXX — 11 digits
      f(null, [5, 6]),
    ],
    placeholder: '07700 900000',
  },
];

/** Default country (Belgium). */
export const DEFAULT_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0]!;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns the best matching format for the digits typed so far.
 * Falls back to the null-detect entry, then to the first entry.
 */
export function getFormat(country: PhoneCountry, digits: string): PhoneFormat {
  return (
    country.formats.find((f) => f.detect !== null && f.detect.test(digits)) ??
    country.formats.find((f) => f.detect === null) ??
    country.formats[0]!
  );
}

/**
 * Applies digit-group spacing to a raw digit string.
 *
 * @example
 * formatPhoneDigits('0470123456', { groups: [4,2,2,2], … }) → '0470 12 34 56'
 */
export function formatPhoneDigits(digits: string, format: PhoneFormat): string {
  let result = '';
  let pos = 0;
  for (const size of format.groups) {
    const chunk = digits.slice(pos, pos + size);
    if (!chunk) break;
    if (pos > 0) result += ' ';
    result += chunk;
    pos += size;
  }
  return result;
}

/**
 * Converts raw local digits + dial code to an E.164 string.
 * Strips the leading `0` the user may have typed (common Belgian habit).
 *
 * @example
 * digitsToE164('+32', '0470123456') → '+32470123456'
 */
export function digitsToE164(dialCode: string, digits: string): string {
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return dialCode + local;
}

/**
 * Returns true when the digit count exactly matches the format total.
 */
export function isFormatComplete(format: PhoneFormat, digits: string): boolean {
  return digits.length === format.total;
}

/**
 * Detects the country from an E.164 string by longest-prefix match.
 * Falls back to `DEFAULT_COUNTRY`.
 */
export function detectCountry(e164: string): PhoneCountry {
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find((c) => e164.startsWith(c.dialCode)) ?? DEFAULT_COUNTRY;
}

/**
 * Parses an E.164 string back to raw local digits (with leading 0 re-added
 * for display purposes, matching the local format conventions).
 *
 * @example
 * e164ToLocalDigits('+32', '+32470123456') → '0470123456'
 */
export function e164ToLocalDigits(dialCode: string, e164: string): string {
  if (!e164.startsWith(dialCode)) return '';
  const local = e164.slice(dialCode.length);
  // Re-add leading 0 for countries that use it locally (BE, FR, NL, DE, GB)
  return local ? `0${local}` : '';
}
