'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Separator } from '@/components/ui/separator';
import { bffGet, bffPost, BffError } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/** Dispatch status literals from the domain enum. */
type DispatchStatus = 'DRAFT' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'FAILED';
type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

interface DispatchData {
  id: string;
  status: DispatchStatus;
  templateId: string | null;
  templateName?: string | null;
  freeTextOriginal?: string | null;
  recipientMode: string;
  messageCount?: number;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageData {
  id: string;
  recipientId: string | null;
  recipientName: string | null;
  anonymousContact: string | null;
  channel: string;
  languageCode: string;
  status: MessageStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
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
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const { data, isLoading } = useQuery<DispatchData>({
    queryKey: QUERY_KEYS.dispatches.byId(dispatchId),
    queryFn: () => bffGet<DispatchData>(BFF_ROUTES.DISPATCHES.BY_ID(dispatchId)),
  });

  const { data: messages } = useQuery<MessageData[]>({
    queryKey: QUERY_KEYS.dispatches.messages(dispatchId),
    queryFn: () => bffGet<MessageData[]>(BFF_ROUTES.DISPATCHES.MESSAGES(dispatchId)),
    enabled: !!data,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bffPost(BFF_ROUTES.DISPATCHES.CANCEL(dispatchId), {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.byId(dispatchId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.messages(dispatchId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.all() });
      toast({ title: t('cancelSuccess'), variant: 'success' });
    },
    onError: (err: unknown) => {
      const message = err instanceof BffError ? err.message : tc('error');
      toast({ title: t('cancelError'), description: message, variant: 'destructive' });
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dispatches.messages(dispatchId) });
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, dispatchId, qc]);

  if (isLoading) return <p className="text-sm text-muted-foreground">{tc('loading')}</p>;
  if (!data) return null;

  const title = data.templateName ?? data.freeTextOriginal?.slice(0, 60) ?? data.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.push(`/${locale}/dispatches`)}
          aria-label={tc('back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            <Badge variant={STATUS_VARIANT[data.status]}>{t(`statuses.${data.status}`)}</Badge>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{data.id}</p>
        </div>
        {(data.status === 'QUEUED' || data.status === 'IN_PROGRESS') && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setConfirmCancelOpen(true)}
          >
            {t('cancel')}
          </Button>
        )}
      </div>

      <Separator />

      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-muted-foreground">{t('template')}</dt>
          <dd>{data.templateName ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">{t('createdAt')}</dt>
          <dd>{new Date(data.createdAt).toLocaleString()}</dd>
        </div>
        {data.messageCount !== undefined && (
          <div>
            <dt className="font-medium text-muted-foreground">{t('recipients')}</dt>
            <dd>{data.messageCount}</dd>
          </div>
        )}
      </dl>

      <Separator />

      {/* Desktop table */}
      <div className="hidden rounded-md border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('recipient')}</th>
              <th className="px-4 py-3 text-left font-medium">Canal</th>
              <th className="px-4 py-3 text-left font-medium">Langue</th>
              <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(messages ?? []).map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {m.recipientName ?? m.anonymousContact ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.channel}</td>
                <td className="px-4 py-3 text-muted-foreground uppercase">{m.languageCode}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      m.status === 'SENT' || m.status === 'DELIVERED'
                        ? 'success'
                        : m.status === 'FAILED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {t(
                      `messageStatuses.${m.status}` as
                        | 'messageStatuses.PENDING'
                        | 'messageStatuses.SENT'
                        | 'messageStatuses.DELIVERED'
                        | 'messageStatuses.FAILED',
                    )}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(m.sentAt ?? m.deliveredAt ?? m.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {messages?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {tc('noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y rounded-md border sm:hidden">
        {(messages ?? []).map((m) => (
          <div key={m.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.recipientName ?? m.anonymousContact ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{m.channel}</span>
                  <span className="text-xs uppercase text-muted-foreground">{m.languageCode}</span>
                </div>
              </div>
              <Badge
                variant={
                  m.status === 'SENT' || m.status === 'DELIVERED'
                    ? 'success'
                    : m.status === 'FAILED'
                      ? 'destructive'
                      : 'warning'
                }
              >
                {t(
                  `messageStatuses.${m.status}` as
                    | 'messageStatuses.PENDING'
                    | 'messageStatuses.SENT'
                    | 'messageStatuses.DELIVERED'
                    | 'messageStatuses.FAILED',
                )}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(m.sentAt ?? m.deliveredAt ?? m.updatedAt).toLocaleString()}
            </p>
          </div>
        ))}
        {messages?.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{tc('noResults')}</p>
        )}
      </div>
      <ConfirmDialog
        open={confirmCancelOpen}
        title={t('cancelConfirmTitle')}
        description={t('cancelConfirm')}
        confirmLabel={t('cancel')}
        cancelLabel={tc('cancel')}
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          cancelMutation.mutate();
          setConfirmCancelOpen(false);
        }}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
}
