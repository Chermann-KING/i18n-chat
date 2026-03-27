'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { bffGet, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/** Dispatch status literals from the domain enum. */
type DispatchStatus = 'DRAFT' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'FAILED';

interface DeliveryResult {
  recipientId: string;
  recipientName: string;
  channel: string;
  status: string;
  sentAt: string | null;
}

interface DispatchData {
  id: string;
  status: DispatchStatus;
  template: { name: string; slug: string };
  createdBy: { email: string };
  createdAt: string;
  deliveries: DeliveryResult[];
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

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';

interface DispatchDetailProps {
  dispatchId: string;
  locale: string;
}

/**
 * Dispatch detail — polls initial state via React Query, then subscribes to
 * WebSocket events for real-time delivery status updates.
 */
export function DispatchDetail({ dispatchId, locale }: DispatchDetailProps) {
  const t = useTranslations('dispatches');
  const tc = useTranslations('common');
  const router = useRouter();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const { data, isLoading } = useQuery<DispatchData>({
    queryKey: QUERY_KEYS.dispatches.byId(dispatchId),
    queryFn: () => bffGet<DispatchData>(BFF_ROUTES.DISPATCHES.BY_ID(dispatchId)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bffPost(BFF_ROUTES.DISPATCHES.CANCEL(dispatchId), {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.byId(dispatchId) });
    },
  });

  /* Subscribe to WebSocket for live updates while dispatch is in progress. */
  useEffect(() => {
    if (
      !data ||
      data.status === 'DONE' ||
      data.status === 'CANCELLED' ||
      data.status === 'FAILED'
    ) {
      return;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/dispatches/${dispatchId}`);
    wsRef.current = ws;

    ws.onmessage = () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.byId(dispatchId) });
    };

    return () => {
      ws.close();
    };
    // `data` is intentionally excluded: we only want to re-subscribe when the
    // terminal status fields change, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, dispatchId, qc]);

  if (isLoading) return <p className="text-sm text-muted-foreground">{tc('loading')}</p>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/dispatches`)}
          aria-label={tc('back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{data.template.name}</h2>
            <p className="text-sm text-muted-foreground">{data.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANT[data.status]}>{t(`statuses.${data.status}`)}</Badge>
            {(data.status === 'QUEUED' || data.status === 'IN_PROGRESS') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(t('cancelConfirm'))) cancelMutation.mutate();
                }}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Meta */}
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-medium text-muted-foreground">{t('template')}</dt>
          <dd className="font-mono">{data.template.slug}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">{t('createdAt')}</dt>
          <dd>{new Date(data.createdAt).toLocaleString()}</dd>
        </div>
      </dl>

      <Separator />

      {/* Deliveries */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('recipients')}</th>
              <th className="px-4 py-3 text-left font-medium">Channel</th>
              <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-left font-medium">Sent at</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.map((d, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3 font-medium">{d.recipientName}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.channel}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      d.status === 'SENT'
                        ? 'success'
                        : d.status === 'FAILED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {d.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.sentAt ? new Date(d.sentAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
