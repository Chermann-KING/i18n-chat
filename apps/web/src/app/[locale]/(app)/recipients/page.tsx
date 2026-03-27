import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { RecipientsView } from '@/components/recipients/recipients-view';

interface RecipientsPageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export async function generateMetadata({ params }: RecipientsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('recipients') };
}

/**
 * Recipients management page — lists recipients and allows CRUD operations.
 */
export default async function RecipientsPage({ params }: RecipientsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <>
      <Topbar locale={locale} title={t('recipients')} />
      <main className="flex-1 overflow-auto p-6">
        <RecipientsView />
      </main>
    </>
  );
}
