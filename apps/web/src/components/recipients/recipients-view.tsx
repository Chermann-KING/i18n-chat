'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bffGet, bffDelete } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { RecipientDialog } from './recipient-dialog';

interface Channel {
  id: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  contact: string;
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  preferredLanguageCode: string;
  channels?: Channel[];
}

interface RecipientsPage {
  data: Recipient[];
  total: number;
}

/**
 * Full recipients list with search, create, edit, and delete.
 */
export function RecipientsView() {
  const t = useTranslations('recipients');
  const tc = useTranslations('common');
  const locale = useLocale();
  const displayNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    {
      id: string;
      firstName: string;
      lastName: string;
      preferredLanguageCode: string;
      channels?: Channel[];
    } | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);

  const { data, isLoading } = useQuery<RecipientsPage>({
    queryKey: QUERY_KEYS.recipients.all({ search }),
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return bffGet<RecipientsPage>(`${BFF_ROUTES.RECIPIENTS.BASE}${qs}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bffDelete(BFF_ROUTES.RECIPIENTS.BY_ID(id)),
    onSuccess: () => {
      const firstName = deleteTarget?.firstName ?? '';
      const lastName = deleteTarget?.lastName ?? '';
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.recipients.all() });
      toast({ title: t('deleteSuccess', { firstName, lastName }), variant: 'success' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={tc('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => { setEditTarget(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{tc('loading')}</p>}

      {!isLoading && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
      )}

      {/* Desktop table */}
      <div className="hidden rounded-md border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('firstName')} / {t('lastName')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('preferredLanguage')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('channels')}</th>
              <th className="px-4 py-3 text-right font-medium">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((recipient) => (
              <tr key={recipient.id} className="border-t">
                <td className="px-4 py-3 font-medium">{recipient.firstName} {recipient.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {(() => {
                    const name = displayNames.of(recipient.preferredLanguageCode) ?? recipient.preferredLanguageCode;
                    return name.charAt(0).toUpperCase() + name.slice(1);
                  })()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {recipient.channels?.map((c) => c.channel).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditTarget({
                          id: recipient.id,
                          firstName: recipient.firstName,
                          lastName: recipient.lastName,
                          preferredLanguageCode: recipient.preferredLanguageCode,
                          channels: recipient.channels,
                        });
                        setDialogOpen(true);
                      }}
                      aria-label={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(recipient)}
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
        {data?.data.map((recipient) => (
          <div key={recipient.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {recipient.firstName} {recipient.lastName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {(() => {
                  const name = displayNames.of(recipient.preferredLanguageCode) ?? recipient.preferredLanguageCode;
                  return name.charAt(0).toUpperCase() + name.slice(1);
                })()}
                {' · '}
                {recipient.channels?.map((c) => c.channel).join(', ') || '—'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditTarget({
                    id: recipient.id,
                    firstName: recipient.firstName,
                    lastName: recipient.lastName,
                    preferredLanguageCode: recipient.preferredLanguageCode,
                    channels: recipient.channels,
                  });
                  setDialogOpen(true);
                }}
                aria-label={tc('edit')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(recipient)}
                aria-label={tc('delete')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <RecipientDialog
        open={dialogOpen}
        editRecipient={editTarget}
        onClose={() => { setDialogOpen(false); setEditTarget(undefined); }}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.recipients.all() });
          setDialogOpen(false);
          setEditTarget(undefined);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDesc', { firstName: deleteTarget?.firstName ?? '', lastName: deleteTarget?.lastName ?? '' })}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
