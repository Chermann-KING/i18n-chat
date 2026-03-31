import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { SupportedLocale } from '@/i18n/routing';
import { dirAttr } from '@/lib/rtl';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Locale-scoped layout.
 * Sets the HTML lang attribute and provides next-intl messages.
 * ThemeProvider lives in the root layout so it survives locale switches.
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = (await params).locale as SupportedLocale;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div lang={locale} dir={dirAttr(locale)} className="contents">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
