'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguageSelect } from '@/components/ui/language-select';
import { bffGet, bffPatch, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from '@/lib/use-toast';

type UserRole = 'ADMIN' | 'SENDER' | 'VIEWER';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When provided the dialog opens in edit mode (PATCH). */
  editUser?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Modal dialog for creating or editing a staff agent.
 *
 * - Create mode: first name + last name + email + role + password.
 *   First/last name are optional but used to personalise the welcome email.
 * - Edit mode: role only (email read-only, password optional to reset).
 */
export function UserDialog({ open, onClose, onSaved, editUser }: UserDialogProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const isEdit = editUser !== undefined;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('SENDER');
  const [preferredLanguageCode, setPreferredLanguageCode] = useState('fr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: languages } = useQuery<{ code: string; label: string }[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<{ code: string; label: string }[]>(BFF_ROUTES.LANGUAGES.BASE),
    enabled: open && !isEdit,
  });

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setEmail(editUser?.email ?? '');
    setRole(editUser?.role ?? 'SENDER');
    setPreferredLanguageCode('fr');
    setPassword('');
    setError(null);
  }, [open, editUser]);

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const body: Record<string, unknown> = { role };
        if (password) body.password = password;
        return bffPatch(BFF_ROUTES.USERS.BY_ID(editUser!.id), body);
      }
      const body: Record<string, unknown> = { email, role, password, preferredLanguageCode };
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
      return bffPost(BFF_ROUTES.USERS.BASE, body);
    },
    onSuccess: () => {
      setError(null);
      toast({
        title: isEdit ? t('updateSuccess', { email }) : t('createSuccess', { email }),
        variant: 'success',
      });
      onSaved();
    },
    onError: () => setError(tc('error')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const canSubmit =
    !mutation.isPending &&
    (isEdit ? role.length > 0 : email.trim().length > 0 && password.length >= 8);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? tc('edit') : t('add')}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          {/* First name + Last name — create mode only */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="user-firstName">{t('firstName')}</Label>
                <Input
                  id="user-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Chermann"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-lastName">{t('lastName')}</Label>
                <Input
                  id="user-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="KING"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="user-email">{t('email')}</Label>
            <Input
              id="user-email"
              type="email"
              required={!isEdit}
              disabled={isEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@exemple.be"
              className={isEdit ? 'bg-muted text-muted-foreground' : undefined}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t('roleADMIN')}</SelectItem>
                <SelectItem value="SENDER">{t('roleSENDER')}</SelectItem>
                <SelectItem value="VIEWER">{t('roleVIEWER')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred language — create mode only */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('preferredLanguage')}</Label>
              <LanguageSelect
                languages={languages ?? []}
                value={preferredLanguageCode}
                onValueChange={setPreferredLanguageCode}
                required
              />
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="user-password">{t('password')}</Label>
            <Input
              id="user-password"
              type="password"
              required={!isEdit}
              minLength={isEdit ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? t('passwordHint') : undefined}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? '…' : isEdit ? tc('save') : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
