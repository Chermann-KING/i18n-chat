import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from './theme-toggle';
import { LocaleSwitcher } from './locale-switcher';
import type { SupportedLocale } from '@/i18n/routing';

interface TopbarProps {
  locale: SupportedLocale;
  title: string;
}

/**
 * Fixed top bar — displays the current section title and action buttons
 * (locale switcher, theme toggle).
 */
export function Topbar({ locale, title }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-sm font-semibold">{title}</h1>
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <LocaleSwitcher currentLocale={locale} />
          <ThemeToggle />
        </div>
      </TooltipProvider>
    </header>
  );
}
