'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Send,
  History,
  FileText,
  Users,
  Settings,
  LogOut,
  MessageSquare,
  UserCog,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { bffGet, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import type { SupportedLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebarStore } from '@/lib/stores/sidebar.store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface AppSidebarProps {
  locale: SupportedLocale;
}

/** Renders nav links, highlighting only the most specific matching path. */
function NavLinks({ navItems, pathname }: { navItems: NavItem[]; pathname: string }) {
  const activeHref = navItems
    .filter(({ href }) => pathname === href || pathname.startsWith(href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
            href === activeHref
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </>
  );
}

/**
 * Left sidebar with primary navigation.
 *
 * - Desktop (md+): always visible as a static sidebar.
 * - Mobile: hidden by default, slides in as a fixed drawer controlled by
 *   {@link useSidebarStore}. A semi-transparent backdrop closes it on tap.
 * - The "Agents" link is only rendered for users with the ADMIN role.
 */
export function AppSidebar({ locale }: AppSidebarProps) {
  const t = useTranslations('nav');
  const tu = useTranslations('users');
  const pathname = usePathname();
  const { isOpen, close } = useSidebarStore();

  const { data: me } = useQuery<{ role: string }>({
    queryKey: QUERY_KEYS.users.me(),
    queryFn: () => bffGet<{ role: string }>(BFF_ROUTES.USERS.ME),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = me?.role === 'ADMIN';

  const navItems: NavItem[] = [
    { href: `/${locale}/dispatches/new`, label: t('dispatch'), icon: Send },
    { href: `/${locale}/dispatches`, label: t('history'), icon: History },
    { href: `/${locale}/templates`, label: t('templates'), icon: FileText },
    { href: `/${locale}/recipients`, label: t('recipients'), icon: Users },
    ...(isAdmin ? [{ href: `/${locale}/users`, label: tu('title'), icon: UserCog }] : []),
  ];

  // Close drawer on route change (mobile navigation).
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Prevent body scroll when mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function handleLogout() {
    await bffPost(BFF_ROUTES.AUTH.LOGOUT, {});
    window.location.href = `/${locale}/login`;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={close} aria-hidden />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base — full-height panel with drawer behaviour on mobile
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 ease-in-out',
          // Desktop — always visible, static in flow
          'md:static md:z-auto md:w-56 md:translate-x-0 md:transition-none',
          // Mobile — slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 px-4">
          <MessageSquare className="h-5 w-5 text-sidebar-primary" />
          <span className="text-sm font-semibold tracking-tight">i18n-chat</span>
        </div>

        <Separator />

        {/* Primary nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <NavLinks navItems={navItems} pathname={pathname} />
        </nav>

        <Separator />

        {/* Bottom actions */}
        <div className="space-y-1 p-2">
          <Link
            href={`/${locale}/settings`}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent/60"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {t('settings')}
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-sm font-normal py-2.5 h-auto"
            onClick={() => {
              void handleLogout();
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t('logout')}
          </Button>
        </div>
      </aside>
    </>
  );
}
