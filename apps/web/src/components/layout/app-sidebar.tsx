'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, History, FileText, Users, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import type { SupportedLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface AppSidebarProps {
  locale: SupportedLocale;
}

/**
 * Fixed left sidebar with primary navigation and logout.
 */
export function AppSidebar({ locale }: AppSidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: `/${locale}/dispatches/new`, label: t('dispatch'), icon: Send },
    { href: `/${locale}/dispatches`, label: t('history'), icon: History },
    { href: `/${locale}/templates`, label: t('templates'), icon: FileText },
    { href: `/${locale}/recipients`, label: t('recipients'), icon: Users },
  ];

  async function handleLogout() {
    await bffPost(BFF_ROUTES.AUTH.LOGOUT, {});
    window.location.href = `/${locale}/login`;
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-4">
        <MessageSquare className="h-5 w-5 text-sidebar-primary" />
        <span className="text-sm font-semibold tracking-tight">i18n-chat</span>
      </div>

      <Separator />

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="space-y-1 p-2">
        <Link
          href={`/${locale}/settings`}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/60"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {t('settings')}
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sm font-normal"
          onClick={() => {
            void handleLogout();
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('logout')}
        </Button>
      </div>
    </aside>
  );
}
