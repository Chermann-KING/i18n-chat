'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bffGet } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

type DispatchStatus = 'DRAFT' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'FAILED';

interface Dispatch {
  id: string;
  status: DispatchStatus;
  template: { name: string };
  recipientCount: number;
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
 * Dispatch history table with status filter, pagination, and CSV export.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {s ? t(`statuses.${s}`) : 'All'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void exportCsv();
            }}
            disabled={exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('exportCsv')}
          </Button>
          <Button size="sm" onClick={() => router.push(`/${locale}/dispatches/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('new')}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{tc('loading')}</p>}
      {!isLoading && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
      )}

      <div className="rounded-md border">
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
                <td className="px-4 py-3 font-medium">{dispatch.template.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{dispatch.recipientCount}</td>
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
    </div>
  );
}
