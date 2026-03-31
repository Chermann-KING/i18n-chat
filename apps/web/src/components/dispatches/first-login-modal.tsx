'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle } from 'lucide-react';
import { bffGet, bffPatch } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from '@/lib/use-toast';

interface MeResponse {
  mustChangePassword: boolean;
}

/**
 * Shown once after first login when `mustChangePassword` is true.
 * The user can either change their password inline or dismiss with "Later".
 * Both actions permanently clear the flag — the modal never reappears.
 */
export function FirstLoginModal() {
  const t = useTranslations('firstLogin');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: me } = useQuery<MeResponse>({
    queryKey: QUERY_KEYS.users.me(),
    queryFn: () => bffGet<MeResponse>(BFF_ROUTES.USERS.ME),
    staleTime: 0,
  });

  const open = me?.mustChangePassword === true;

  /** Clears the flag without changing the password. */
  const dismissMutation = useMutation({
    mutationFn: () => bffPatch(BFF_ROUTES.USERS.ME_PASSWORD_PROMPT, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me() });
    },
  });

  /** Changes the password (which also clears the flag server-side). */
  const changeMutation = useMutation({
    mutationFn: () => bffPatch(BFF_ROUTES.USERS.ME_PASSWORD, { currentPassword, newPassword }),
    onSuccess: () => {
      setError(null);
      toast({ title: t('success'), variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me() });
    },
    onError: () => setError(tc('error')),
  });

  const rules: { label: string; met: boolean }[] = [
    { label: t('ruleMinLength'), met: newPassword.length >= 8 },
    { label: t('ruleUppercase'), met: /[A-Z]/.test(newPassword) },
    { label: t('ruleDigit'), met: /[0-9]/.test(newPassword) },
    { label: t('ruleSpecial'), met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const allRulesMet = rules.every((r) => r.met);

  const canSubmit =
    !changeMutation.isPending &&
    !dismissMutation.isPending &&
    currentPassword.length > 0 &&
    allRulesMet;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    changeMutation.mutate();
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-md flex-col overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-1">
            {/* Password rules checklist */}
            <div className="rounded-md border p-3 space-y-1.5">
              <p className="text-sm font-medium mb-2">{t('rulesTitle')}</p>
              {rules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-2 text-sm">
                  {rule.met ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={rule.met ? 'text-foreground' : 'text-muted-foreground'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fl-current">{t('currentPassword')}</Label>
              <Input
                id="fl-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fl-new">{t('newPassword')}</Label>
              <Input
                id="fl-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="shrink-0 mt-4 flex flex-col gap-2">
            <Button type="submit" disabled={!canSubmit}>
              {changeMutation.isPending ? '…' : t('submit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground text-sm"
              disabled={dismissMutation.isPending || changeMutation.isPending}
              onClick={() => dismissMutation.mutate()}
            >
              {t('later')} — {t('laterHint')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
