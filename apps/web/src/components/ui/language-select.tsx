'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Language {
  code: string;
  label: string;
}

interface LanguageSelectProps {
  languages: Language[];
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Shared language selector.
 *
 * Displays each language name translated into the current UI locale
 * using `Intl.DisplayNames`, with the ISO code as a suffix (e.g. "Anglais (EN)").
 * Falls back to the database label when the browser cannot resolve the name.
 */
export function LanguageSelect({
  languages,
  value,
  onValueChange,
  placeholder = '—',
  required,
  disabled,
}: LanguageSelectProps) {
  const locale = useLocale();
  const displayNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );

  return (
    <Select value={value} onValueChange={onValueChange} required={required} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => {
          const name = displayNames.of(lang.code) ?? lang.label;
          const label = name.charAt(0).toUpperCase() + name.slice(1);
          return (
            <SelectItem key={lang.code} value={lang.code}>
              {label} ({lang.code.toUpperCase()})
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
