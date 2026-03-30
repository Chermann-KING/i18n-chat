'use client';

import { useState } from 'react';
import { useTranslations, useMessages } from 'next-intl';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { bffGet, bffDelete } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { useTemplatesStore } from '@/lib/stores/templates.store';
import { TemplateDialog } from './template-dialog';
import { TemplateDetail } from './template-detail';

interface TemplateTranslation {
  languageCode: string;
  waTemplateStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
}

interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  translations?: TemplateTranslation[];
}

interface TemplatesPage {
  data: Template[];
  total: number;
}

/**
 * Templates list with create, delete, and drill-down to translations.
 */
export function TemplatesView() {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const messages = useMessages();
  const categoryLabels = (messages.templates as { categories: Record<string, string> }).categories;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { selectedId, openTemplate, closeTemplate } = useTemplatesStore();

  const { data, isLoading } = useQuery<TemplatesPage>({
    queryKey: QUERY_KEYS.templates.all(),
    queryFn: () => bffGet<TemplatesPage>(`${BFF_ROUTES.TEMPLATES.BASE}?isActive=true`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bffDelete(BFF_ROUTES.TEMPLATES.BY_ID(id)),
    onSuccess: () => {
      setDeleteId(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.all() });
    },
  });

  if (selectedId) {
    return <TemplateDetail templateId={selectedId} onBack={closeTemplate} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button onClick={() => setDialogOpen(true)}>
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
              <th className="px-4 py-3 text-left font-medium">{t('name')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('slug')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('category')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('translations')}</th>
              <th className="px-4 py-3 text-right font-medium">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((tpl) => (
              <tr
                key={tpl.id}
                className="cursor-pointer border-t hover:bg-muted/30"
                onClick={() => openTemplate(tpl.id)}
              >
                <td className="px-4 py-3 font-medium">{tpl.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tpl.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {categoryLabels[tpl.category] ?? tpl.category}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {tpl.translations?.map((tr) => (
                      <WhatsAppBadge
                        key={tr.languageCode}
                        status={tr.waTemplateStatus}
                        lang={tr.languageCode}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(tpl.id)}
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y rounded-md border sm:hidden">
        {data?.data.map((tpl) => (
          <div
            key={tpl.id}
            className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-muted/30"
            onClick={() => openTemplate(tpl.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{tpl.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {categoryLabels[tpl.category] ?? tpl.category}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tpl.translations?.map((tr) => (
                  <WhatsAppBadge
                    key={tr.languageCode}
                    status={tr.waTemplateStatus}
                    lang={tr.languageCode}
                  />
                ))}
              </div>
            </div>
            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(tpl.id)}
                aria-label={tc('delete')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.all() });
          setDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title={t('deleteConfirm')}
        description={t('deleteConfirmDesc')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function WhatsAppBadge({
  status,
  lang,
}: {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
  lang: string;
}) {
  const variant =
    status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'destructive' : 'warning';
  return (
    <Badge variant={status ? variant : 'outline'} className="uppercase">
      {lang}
    </Badge>
  );
}
