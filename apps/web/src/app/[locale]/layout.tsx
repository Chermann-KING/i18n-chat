import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import type { SupportedLocale } from '@/i18n/routing';
import '../globals.css';

export const metadata: Metadata = {
  title: 'i18n-chat',
  description: 'Multilingual message dispatch platform',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: SupportedLocale }>;
}

/**
 * Locale-scoped root layout.
 * Wraps every page with the NextIntl provider (messages) and
 * the next-themes ThemeProvider (light / dark mode).
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
