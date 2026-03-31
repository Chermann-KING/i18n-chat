import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { UsersView } from '@/components/users/users-view';

interface UsersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: UsersPageProps) {
  const locale = (await params).locale as SupportedLocale;
  const t = await getTranslations({ locale, namespace: 'users' });
  return { title: t('title') };
}

/**
 * Staff agent management page — ADMIN only.
 * Listing, creation, role update and activation/deactivation are all
 * enforced by the API via the @Roles(UserRole.ADMIN) guard.
 */
export default async function UsersPage({ params }: UsersPageProps) {
  const locale = (await params).locale as SupportedLocale;
  const t = await getTranslations({ locale, namespace: 'users' });

  return (
    <>
      <Topbar locale={locale} title={t('title')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <UsersView />
      </main>
    </>
  );
}
