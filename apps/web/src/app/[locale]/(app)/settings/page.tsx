import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { Topbar } from '@/components/layout/topbar';
import { SettingsView } from '@/components/settings/settings-view';

interface SettingsPageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export async function generateMetadata({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  return { title: t('title') };
}

/**
 * Settings page — profile, password, preferences and notifications.
 */
export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });

  return (
    <>
      <Topbar locale={locale} title={t('title')} />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <SettingsView locale={locale} />
      </main>
    </>
  );
}
