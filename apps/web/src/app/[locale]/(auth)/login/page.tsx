import { getTranslations } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { LoginForm } from '@/components/auth/login-form';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Staff login page — accessible at `/:locale/login`.
 * Renders a centred card with the `LoginForm` client component.
 */
export async function generateMetadata({ params }: LoginPageProps) {
  const locale = (await params).locale as SupportedLocale;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('login') };
}

export default async function LoginPage({ params }: LoginPageProps) {
  const locale = (await params).locale as SupportedLocale;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('login')}</h1>
          <p className="text-sm text-muted-foreground">i18n-chat</p>
        </div>
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
