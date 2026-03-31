'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bffPost, BffError } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';

interface LoginFormProps {
  /** Locale used to build the post-login redirect URL. */
  locale: string;
}

/**
 * Staff login form.
 * On success, the BFF stores tokens in HttpOnly cookies and we redirect to the dashboard.
 */
export function LoginForm({ locale }: LoginFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await bffPost<{ preferredLanguageCode: string }>(BFF_ROUTES.AUTH.LOGIN, {
        email,
        password,
      });
      const targetLocale = result.preferredLanguageCode ?? locale;
      router.push(`/${targetLocale}/dispatches`);
    } catch (err) {
      if (err instanceof BffError && err.status === 401) {
        setError(t('invalidCredentials'));
      } else {
        setError(t('loginError'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '…' : t('submit')}
      </Button>
    </form>
  );
}
