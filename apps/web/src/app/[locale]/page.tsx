import { redirect } from 'next/navigation';
import type { SupportedLocale } from '@/i18n/routing';

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Locale root page — redirects to the login page for this locale.
 * The auth guard in the app layout (Phase 8.2) handles authenticated redirects.
 */
export default async function LocalePage({ params }: LocalePageProps): Promise<never> {
  const locale = (await params).locale as SupportedLocale;
  redirect(`/${locale}/login`);
}
