'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, PowerOff, Power } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bffGet, bffPatch } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { UserDialog } from './user-dialog';

type UserRole = 'ADMIN' | 'SENDER' | 'VIEWER';

interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  SENDER: 'secondary',
  VIEWER: 'outline',
};

/**
 * Full staff agents list with search, create, edit, and activate/deactivate.
 *
 * Deletion is intentionally absent: agents are soft-deleted (isActive = false)
 * to preserve foreign-key references in dispatches and audit logs.
 */
export function UsersView() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    { id: string; email: string; role: UserRole } | undefined
  >();
  const [toggleTarget, setToggleTarget] = useState<StaffUser | null>(null);

  const { data: users, isLoading } = useQuery<StaffUser[]>({
    queryKey: QUERY_KEYS.users.all(),
    queryFn: () => bffGet<StaffUser[]>(BFF_ROUTES.USERS.BASE),
  });

  const toggleMutation = useMutation({
    mutationFn: (user: StaffUser) =>
      bffPatch(BFF_ROUTES.USERS.BY_ID(user.id), { isActive: !user.isActive }),
    onSuccess: () => {
      const { email, isActive } = toggleTarget!;
      setToggleTarget(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users.all() });
      toast({
        title: isActive ? t('deactivateSuccess', { email }) : t('activateSuccess', { email }),
        variant: 'success',
      });
    },
  });

  const filtered = (users ?? []).filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.firstName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.lastName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function openCreate() {
    setEditTarget(undefined);
    setDialogOpen(true);
  }

  function openEdit(user: StaffUser) {
    setEditTarget({ id: user.id, email: user.email, role: user.role });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder={tc('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{tc('loading')}</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
      )}

      {/* Desktop table */}
      <div className="hidden rounded-md border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('email')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('role')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-right font-medium">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.email}</p>
                  {(user.firstName || user.lastName) && (
                    <p className="text-xs text-muted-foreground">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_VARIANT[user.role]}>{t(`role${user.role}`)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                    {user.isActive ? t('statusActive') : t('statusInactive')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(user)}
                      aria-label={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setToggleTarget(user)}
                      aria-label={
                        user.isActive ? t('deactivateConfirmTitle') : t('activateConfirmTitle')
                      }
                    >
                      {user.isActive ? (
                        <PowerOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Power className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y rounded-md border sm:hidden">
        {filtered.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={ROLE_VARIANT[user.role]} className="text-xs">
                  {t(`role${user.role}`)}
                </Badge>
                <Badge variant={user.isActive ? 'secondary' : 'outline'} className="text-xs">
                  {user.isActive ? t('statusActive') : t('statusInactive')}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEdit(user)}
                aria-label={tc('edit')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setToggleTarget(user)}
                aria-label={user.isActive ? t('deactivateConfirmTitle') : t('activateConfirmTitle')}
              >
                {user.isActive ? (
                  <PowerOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Power className="h-4 w-4 text-green-600" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <UserDialog
        open={dialogOpen}
        editUser={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(undefined);
        }}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.users.all() });
          setDialogOpen(false);
          setEditTarget(undefined);
        }}
      />

      {/* Activate / Deactivate confirmation */}
      <ConfirmDialog
        open={toggleTarget !== null}
        title={toggleTarget?.isActive ? t('deactivateConfirmTitle') : t('activateConfirmTitle')}
        description={
          toggleTarget?.isActive
            ? t('deactivateConfirmDesc', { email: toggleTarget?.email ?? '' })
            : t('activateConfirmDesc', { email: toggleTarget?.email ?? '' })
        }
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        destructive={toggleTarget?.isActive ?? false}
        loading={toggleMutation.isPending}
        onConfirm={() => {
          if (toggleTarget) toggleMutation.mutate(toggleTarget);
        }}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
