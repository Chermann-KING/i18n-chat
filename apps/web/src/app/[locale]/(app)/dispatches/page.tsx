import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { DispatchHistory } from '@/components/dispatches/dispatch-history';

interface DispatchesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DispatchesPageProps) {
  const { locale } = (await params) as { locale: SupportedLocale };
  const t = await getTranslations({ locale, namespace: 'dispatches' });
  return { title: t('title') };
}

/**
 * Dispatch history page — lists all dispatches with status badges and CSV export.
 */
export default async function DispatchesPage({ params }: DispatchesPageProps) {
  const { locale } = (await params) as { locale: SupportedLocale };
  const t = await getTranslations({ locale, namespace: 'dispatches' });

  return (
    <>
      <Topbar locale={locale} title={t('title')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <DispatchHistory locale={locale} />
      </main>
    </>
  );
}
