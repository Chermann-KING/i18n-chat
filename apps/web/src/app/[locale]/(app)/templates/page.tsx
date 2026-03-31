import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { TemplatesView } from '@/components/templates/templates-view';

interface TemplatesPageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export async function generateMetadata({ params }: TemplatesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('templates') };
}

/**
 * Templates management page — lists message templates and their translations.
 */
export default async function TemplatesPage({ params }: TemplatesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <>
      <Topbar locale={locale} title={t('templates')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <TemplatesView />
      </main>
    </>
  );
}
