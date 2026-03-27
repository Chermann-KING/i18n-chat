'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bffGet, bffPost, bffDelete } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { RecipientDialog } from './recipient-dialog';

interface Channel {
  id: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP';
  value: string;
}

interface Recipient {
  id: string;
  name: string;
  preferredLanguage: { code: string };
  channels: Channel[];
}

interface RecipientsPage {
  data: Recipient[];
  total: number;
}

/**
 * Full recipients list with search, create, and delete.
 */
export function RecipientsView() {
  const t = useTranslations('recipients');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.recipients.all() });
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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{tc('loading')}</p>}

      {!isLoading && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
      )}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('name')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('preferredLanguage')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('channels')}</th>
              <th className="px-4 py-3 text-right font-medium">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((recipient) => (
              <tr key={recipient.id} className="border-t">
                <td className="px-4 py-3 font-medium">{recipient.name}</td>
                <td className="px-4 py-3 uppercase text-muted-foreground">
                  {recipient.preferredLanguage.code}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {recipient.channels.map((c) => c.type).join(', ')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(t('deleteConfirm'))) {
                        deleteMutation.mutate(recipient.id);
                      }
                    }}
                    aria-label={tc('delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecipientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.recipients.all() });
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
