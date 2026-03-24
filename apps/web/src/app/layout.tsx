import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'i18n-chat',
  description: 'Multilingual message dispatch platform',
};

/**
 * Root layout — wraps every page with the NextIntl provider and base HTML structure.
 * The locale is resolved server-side via next-intl middleware.
 */
/**
 * In Next.js 15, `params` and `searchParams` are Promises — must be awaited.
 * The locale is resolved server-side by the next-intl middleware.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
