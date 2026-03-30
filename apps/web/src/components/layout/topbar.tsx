import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from './theme-toggle';
import { LocaleSwitcher } from './locale-switcher';
import { MobileMenuButton } from './mobile-menu-button';
import type { SupportedLocale } from '@/i18n/routing';

interface TopbarProps {
  locale: SupportedLocale;
  title: string;
}

/**
 * Fixed top bar — displays the current section title and action buttons.
 * On mobile, shows a hamburger button to open the sidebar drawer.
 */
export function Topbar({ locale, title }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-6">
      <div className="flex items-center gap-1 min-w-0">
        <MobileMenuButton />
        <h1 className="truncate text-sm font-semibold">{title}</h1>
      </div>
      <TooltipProvider>
        <div className="flex shrink-0 items-center gap-1">
          <LocaleSwitcher currentLocale={locale} />
          <ThemeToggle />
        </div>
      </TooltipProvider>
    </header>
  );
}
