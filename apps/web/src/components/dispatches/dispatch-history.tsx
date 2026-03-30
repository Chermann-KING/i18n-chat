'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Check, Download, ListFilter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { bffGet } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

type DispatchStatus = 'DRAFT' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'FAILED';

interface Dispatch {
  id: string;
  status: DispatchStatus;
  templateName?: string | null;
  freeTextOriginal?: string | null;
  messageCount?: number;
  createdAt: string;
}

interface DispatchesPage {
  data: Dispatch[];
  total: number;
}

const STATUS_VARIANT: Record<
  DispatchStatus,
  'default' | 'secondary' | 'warning' | 'success' | 'destructive'
> = {
  DRAFT: 'secondary',
  QUEUED: 'warning',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'secondary',
  FAILED: 'destructive',
};

interface DispatchHistoryProps {
  locale: string;
}

/**
 * Dispatch history — status filter bar, CSV export, and dispatch list.
 * Renders a scrollable table on sm+ and a card list on mobile.
 */
export function DispatchHistory({ locale }: DispatchHistoryProps) {
  const t = useTranslations('dispatches');
  const tc = useTranslations('common');
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | ''>('');
  const [exportLoading, setExportLoading] = useState(false);

  const { data, isLoading } = useQuery<DispatchesPage>({
    queryKey: QUERY_KEYS.dispatches.all({ status: statusFilter }),
    queryFn: () => {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      return bffGet<DispatchesPage>(`${BFF_ROUTES.DISPATCHES.BASE}${qs}`);
    },
  });

  async function exportCsv() {
    setExportLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const response = await fetch(`${BFF_ROUTES.DISPATCHES.CSV}${qs}`, {
        credentials: 'same-origin',
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dispatches.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  const STATUS_OPTIONS: Array<DispatchStatus | ''> = [
    '',
    'DRAFT',
    'QUEUED',
    'IN_PROGRESS',
    'DONE',
    'CANCELLED',
    'FAILED',
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">
                {statusFilter ? t(`statuses.${statusFilter}`) : tc('all')}
              </span>
              {statusFilter && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 rounded-sm px-1 text-[10px] sm:hidden"
                >
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setStatusFilter(s)}
                className="flex items-center justify-between"
              >
                <span>{s ? t(`statuses.${s}`) : tc('all')}</span>
                {statusFilter === s && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportCsv();
            }}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('exportCsv')}</span>
          </Button>
          <Button size="sm" onClick={() => router.push(`/${locale}/dispatches/new`)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('new')}</span>
          </Button>
        </div>
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
              <th className="px-4 py-3 text-left font-medium">{t('template')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('recipients')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('createdAt')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((dispatch) => (
              <tr
                key={dispatch.id}
                className="cursor-pointer border-t hover:bg-muted/30"
                onClick={() => router.push(`/${locale}/dispatches/${dispatch.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  {dispatch.templateName ?? dispatch.freeTextOriginal?.slice(0, 40) ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{dispatch.messageCount ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[dispatch.status]}>
                    {t(`statuses.${dispatch.status}`)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(dispatch.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y rounded-md border sm:hidden">
        {data?.data.map((dispatch) => (
          <div
            key={dispatch.id}
            className="cursor-pointer p-4 hover:bg-muted/30"
            onClick={() => router.push(`/${locale}/dispatches/${dispatch.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium leading-snug">
                {dispatch.templateName ?? dispatch.freeTextOriginal?.slice(0, 50) ?? '—'}
              </span>
              <Badge variant={STATUS_VARIANT[dispatch.status]} className="shrink-0">
                {t(`statuses.${dispatch.status}`)}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {dispatch.messageCount ?? '—'} {t('recipients')}
              </span>
              <span>{new Date(dispatch.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
