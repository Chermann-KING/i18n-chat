'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { bffGet, bffPatch, BffError } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  preferredLanguageCode: string;
  notifyOnFailure: boolean;
  role: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français (FR)' },
  { code: 'nl', label: 'Nederlands (NL)' },
  { code: 'en', label: 'English (EN)' },
];

interface SettingsViewProps {
  locale: string;
}

/**
 * Full settings page — profile, password, preferences and notifications.
 */
export function SettingsView({ locale }: SettingsViewProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: QUERY_KEYS.users.me(),
    queryFn: () => bffGet<UserProfile>(BFF_ROUTES.USERS.ME),
  });

  // ─── Profile form state ───────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
    }
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: () => bffPatch(BFF_ROUTES.USERS.ME_PROFILE, { firstName, lastName }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users.me() });
      toast({ title: t('profileSuccess'), variant: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof BffError ? err.message : tc('error');
      toast({ title: t('profileError'), description: msg, variant: 'destructive' });
    },
  });

  // ─── Password form state ──────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: () => bffPatch(BFF_ROUTES.USERS.ME_PASSWORD, { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      toast({ title: t('passwordSuccess'), variant: 'success' });
    },
    onError: (err: unknown) => {
      const isWrong = err instanceof BffError && err.message.includes('incorrect');
      toast({
        title: isWrong ? t('passwordWrong') : t('passwordError'),
        variant: 'destructive',
      });
    },
  });

  // ─── Preferences ─────────────────────────────────────────────────────────
  const prefMutation = useMutation({
    mutationFn: (lang: string) =>
      bffPatch(BFF_ROUTES.USERS.ME_PROFILE, { preferredLanguageCode: lang }),
    onSuccess: (_data, lang) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users.me() });
      toast({ title: t('preferencesSuccess'), variant: 'success' });
      router.push(`/${lang}/settings`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof BffError ? err.message : tc('error');
      toast({ title: t('preferencesError'), description: msg, variant: 'destructive' });
    },
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  const notifMutation = useMutation({
    mutationFn: (notifyOnFailure: boolean) =>
      bffPatch(BFF_ROUTES.USERS.ME_NOTIFICATIONS, { notifyOnFailure }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users.me() });
      toast({ title: t('notificationsSuccess'), variant: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof BffError ? err.message : tc('error');
      toast({ title: t('notificationsError'), description: msg, variant: 'destructive' });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">{tc('loading')}</p>;
  if (!profile) return null;

  return (
    <div className="space-y-10">
      {/* ── Profile ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t('profile')}</h2>
          <p className="text-sm text-muted-foreground">{t('profileDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('firstName')}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('lastName')}</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">{t('emailHint')}</p>
          </div>
        </div>
        <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
          {profileMutation.isPending ? '…' : t('saveProfile')}
        </Button>
      </section>

      <Separator />

      {/* ── Password ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t('password')}</h2>
          <p className="text-sm text-muted-foreground">{t('passwordDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button
          onClick={() => passwordMutation.mutate()}
          disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 8}
        >
          {passwordMutation.isPending ? '…' : t('changePassword')}
        </Button>
      </section>

      <Separator />

      {/* ── Preferences ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t('preferences')}</h2>
          <p className="text-sm text-muted-foreground">{t('preferencesDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('language')}</Label>
            <Select
              defaultValue={profile.preferredLanguageCode}
              onValueChange={(lang) => prefMutation.mutate(lang)}
              disabled={prefMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('theme')}</Label>
            <Select defaultValue={theme ?? 'system'} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('themeLight')}</SelectItem>
                <SelectItem value="dark">{t('themeDark')}</SelectItem>
                <SelectItem value="system">{t('themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Notifications ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t('notifications')}</h2>
          <p className="text-sm text-muted-foreground">{t('notificationsDesc')}</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="notifyOnFailure"
            checked={profile.notifyOnFailure}
            disabled={notifMutation.isPending}
            onCheckedChange={(checked) => notifMutation.mutate(Boolean(checked))}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium leading-none">{t('notifyOnFailure')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('notifyOnFailureHint')}</p>
          </div>
        </label>
      </section>
    </div>
  );
}
