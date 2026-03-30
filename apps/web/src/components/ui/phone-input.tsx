'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_COUNTRY,
  detectCountry,
  digitsToE164,
  e164ToLocalDigits,
  formatPhoneDigits,
  getFormat,
  isFormatComplete,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '@/lib/phone-countries';

export interface PhoneInputProps {
  /**
   * Controlled value in E.164 format (e.g. `"+32470123456"`).
   * Pass an empty string for an empty/reset field.
   */
  value: string;
  /**
   * Fired on every keystroke.
   *
   * @param e164   - Full E.164 value (`dialCode` + local digits, no spaces).
   * @param valid  - `true` when the digit count matches the active format total.
   */
  onChange: (e164: string, valid: boolean) => void;
  /** Additional CSS class applied to the outer wrapper `<div>`. */
  className?: string;
  /** HTML `id` forwarded to the text `<input>` for `<label htmlFor>`. */
  id?: string;
}

/**
 * Controlled phone-number input with:
 * - Country / dial-code selector (flag + code, name via `Intl.DisplayNames`)
 * - Real-time digit-group formatting (spaces inserted as the user types)
 * - Hard cap at the expected digit count — further input is silently blocked
 * - Inline error shown on blur when the number is incomplete
 *
 * The value prop and onChange callback both use E.164 (`+32470123456`).
 *
 * @example
 * <PhoneInput value={phone} onChange={(e164, valid) => setPhone(e164)} />
 */
export function PhoneInput({ value, onChange, className, id }: PhoneInputProps) {
  const locale = useLocale();
  const regionNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'region' }),
    [locale],
  );

  const [country, setCountry] = useState<PhoneCountry>(() =>
    value ? detectCountry(value) : DEFAULT_COUNTRY,
  );

  // Raw digits the user has typed (e.g. "0470123456") — no spaces
  const [rawDigits, setRawDigits] = useState<string>(() =>
    value ? e164ToLocalDigits(country.dialCode, value) : '',
  );

  const [touched, setTouched] = useState(false);

  // Track the cursor position so we can restore it after forced re-format
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  // Re-sync when value changes from outside (e.g. form reset)
  useEffect(() => {
    if (!value) {
      setRawDigits('');
      setTouched(false);
      return;
    }
    const detected = detectCountry(value);
    setCountry(detected);
    setRawDigits(e164ToLocalDigits(detected.dialCode, value));
  }, [value]);

  // Restore cursor position after React re-render overwrites the input value
  useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  const applyChange = useCallback(
    (digits: string, newCountry: PhoneCountry) => {
      const fmt = getFormat(newCountry, digits);
      const clamped = digits.slice(0, fmt.total);
      const valid = isFormatComplete(fmt, clamped);
      const e164 = clamped ? digitsToE164(newCountry.dialCode, clamped) : '';
      onChange(e164, valid);
      return clamped;
    },
    [onChange],
  );

  function handleCountryChange(iso: string) {
    const next = PHONE_COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
    setCountry(next);
    setRawDigits('');
    setTouched(false);
    onChange('', false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Extract only digit characters from whatever the user pasted / typed
    const digits = raw.replace(/\D/g, '');

    const fmt = getFormat(country, digits);

    // Block input beyond the format max — calculate where cursor should land
    if (digits.length > fmt.total) {
      // Re-apply the current clamped value and restore cursor
      const fmt2 = getFormat(country, rawDigits);
      const formatted = formatPhoneDigits(rawDigits, fmt2);
      cursorRef.current = formatted.length;
      return; // discard the over-limit input entirely
    }

    const clamped = applyChange(digits, country);
    setRawDigits(clamped);

    // Calculate where the cursor should sit inside the formatted string
    const newFmt = getFormat(country, clamped);
    const formatted = formatPhoneDigits(clamped, newFmt);

    // Map from raw digit position to formatted position
    // The cursor in formatted string = digit position + number of spaces before it
    const caretInDigits = Math.min(
      (e.target.selectionStart ?? formatted.length) - countSpacesBefore(raw, e.target.selectionStart ?? 0),
      clamped.length,
    );
    cursorRef.current = digitPosToFormattedPos(formatted, caretInDigits);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow control keys through unconditionally
    if (e.ctrlKey || e.metaKey) return;

    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;

    // Block non-digit characters at the keyboard level
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Block if already at max digits
    const fmt = getFormat(country, rawDigits);
    if (rawDigits.length >= fmt.total) {
      e.preventDefault();
    }
  }

  const fmt = getFormat(country, rawDigits);
  const displayValue = formatPhoneDigits(rawDigits, fmt);
  const isComplete = isFormatComplete(fmt, rawDigits);
  const showError = touched && rawDigits.length > 0 && !isComplete;

  return (
    <div className={className}>
      <div className="flex gap-2">
        {/* Country / dial-code selector */}
        <Select value={country.iso} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span>{country.flag}</span>
                <span className="text-xs text-muted-foreground">{country.dialCode}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{regionNames.of(c.iso) ?? c.iso}</span>
                  <span className="text-xs text-muted-foreground">{c.dialCode}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Formatted local number input */}
        <Input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder={country.placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          className={showError ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </div>

      {showError && (
        <p className="mt-1 text-xs text-destructive">
          Format attendu&nbsp;: {country.placeholder}
          {' '}({rawDigits.length}/{fmt.total} chiffres)
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

/** Counts space characters that appear before `pos` in a string. */
function countSpacesBefore(s: string, pos: number): number {
  return s.slice(0, pos).split(' ').length - 1;
}

/**
 * Converts a 0-based digit index into the corresponding position in the
 * formatted string (which contains spaces between groups).
 */
function digitPosToFormattedPos(formatted: string, digitIndex: number): number {
  let digits = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ' ') {
      if (digits === digitIndex) return i;
      digits++;
    }
  }
  return formatted.length;
}
