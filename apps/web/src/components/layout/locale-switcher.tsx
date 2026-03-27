'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LOCALES } from '@/i18n/routing';
import type { SupportedLocale } from '@/i18n/routing';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: 'Français',
  nl: 'Nederlands',
  en: 'English',
};

/**
 * Dropdown button that switches the UI language.
 * Replaces only the locale segment of the current pathname so the user
 * stays on the same page after switching.
 */
export function LocaleSwitcher({ currentLocale }: { currentLocale: SupportedLocale }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(locale: SupportedLocale) {
    const segments = pathname.split('/');
    segments[1] = locale;
    router.push(segments.join('/'));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Switch language">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className={locale === currentLocale ? 'font-semibold' : ''}
          >
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
