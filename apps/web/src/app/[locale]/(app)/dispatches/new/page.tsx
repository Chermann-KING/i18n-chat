import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { DispatchWizard } from '@/components/dispatches/dispatch-wizard';

interface NewDispatchPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: NewDispatchPageProps) {
  const { locale } = (await params) as { locale: SupportedLocale };
  const t = await getTranslations({ locale, namespace: 'dispatches' });
  return { title: t('new') };
}

/**
 * New dispatch page — hosts the multi-step wizard (template → variables → recipients → review).
 */
export default async function NewDispatchPage({ params }: NewDispatchPageProps) {
  const { locale } = (await params) as { locale: SupportedLocale };
  const t = await getTranslations({ locale, namespace: 'dispatches' });

  return (
    <>
      <Topbar locale={locale} title={t('new')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <DispatchWizard locale={locale} />
      </main>
    </>
  );
}
