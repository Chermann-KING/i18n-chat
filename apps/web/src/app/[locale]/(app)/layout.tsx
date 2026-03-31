import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SupportedLocale } from '@/i18n/routing';
import { ACCESS_TOKEN_COOKIE } from '@/lib/api-client';
import { Providers } from '@/lib/providers';
import { AppSidebar } from '@/components/layout/app-sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Protected app shell — guards all dashboard routes.
 * Redirects unauthenticated users to the login page.
 * Wraps authenticated content with React Query providers and the sidebar.
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = (await params) as { locale: SupportedLocale };
  const cookieStore = await cookies();
  const hasToken = cookieStore.has(ACCESS_TOKEN_COOKIE);

  if (!hasToken) {
    redirect(`/${locale}/login`);
  }

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar locale={locale} />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </Providers>
  );
}
