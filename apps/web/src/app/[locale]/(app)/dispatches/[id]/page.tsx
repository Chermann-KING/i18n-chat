import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { DispatchDetail } from '@/components/dispatches/dispatch-detail';

interface DispatchDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: DispatchDetailPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dispatches' });
  return { title: t('title') };
}

/**
 * Dispatch detail page — shows status and real-time delivery updates via WebSocket.
 */
export default async function DispatchDetailPage({ params }: DispatchDetailPageProps) {
  const { locale, id } = (await params) as { locale: SupportedLocale; id: string };
  const t = await getTranslations({ locale, namespace: 'dispatches' });

  return (
    <>
      <Topbar locale={locale} title={t('title')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <DispatchDetail dispatchId={id} locale={locale} />
      </main>
    </>
  );
}
