'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { bffGet, bffPost, bffDelete } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface Language {
  code: string;
  name: string;
}

interface TemplateTranslation {
  languageCode: string;
  subject: string | null;
  body: string;
  whatsappStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

interface TemplateDetail {
  id: string;
  name: string;
  slug: string;
  fallbackLanguage: { code: string };
  translations: TemplateTranslation[];
}

interface TemplateDetailProps {
  templateId: string;
  onBack: () => void;
}

/**
 * Template drill-down view — shows translations and allows adding / removing them.
 * The WhatsApp approval status is display-only (managed via Meta Business API).
 */
export function TemplateDetail({ templateId, onBack }: TemplateDetailProps) {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [addingLang, setAddingLang] = useState('');
  const [addingSubject, setAddingSubject] = useState('');
  const [addingBody, setAddingBody] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: tpl, isLoading } = useQuery<TemplateDetail>({
    queryKey: QUERY_KEYS.templates.byId(templateId),
    queryFn: () => bffGet<TemplateDetail>(BFF_ROUTES.TEMPLATES.BY_ID(templateId)),
  });

  const { data: languages } = useQuery<Language[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<Language[]>(BFF_ROUTES.LANGUAGES.BASE),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      bffPost(BFF_ROUTES.TEMPLATES.TRANSLATIONS(templateId), {
        languageCode: addingLang,
        subject: addingSubject || null,
        body: addingBody,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
      setShowAdd(false);
      setAddingLang('');
      setAddingSubject('');
      setAddingBody('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (lang: string) => bffDelete(BFF_ROUTES.TEMPLATES.TRANSLATION(templateId, lang)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
    },
  });

  const existingCodes = new Set(tpl?.translations.map((tr) => tr.languageCode) ?? []);
  const availableLanguages = languages?.filter((l) => !existingCodes.has(l.code)) ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">{tc('loading')}</p>;
  if (!tpl) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label={tc('back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{tpl.name}</h2>
          <p className="font-mono text-sm text-muted-foreground">{tpl.slug}</p>
        </div>
      </div>

      <Separator />

      {/* Translations list */}
      <div className="space-y-3">
        {tpl.translations.map((tr) => {
          const waVariant =
            tr.whatsappStatus === 'APPROVED'
              ? 'success'
              : tr.whatsappStatus === 'REJECTED'
                ? 'destructive'
                : 'warning';

          return (
            <div key={tr.languageCode} className="rounded-md border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase">{tr.languageCode}</span>
                  {tr.whatsappStatus && (
                    <Badge variant={waVariant}>
                      {t(tr.whatsappStatus.toLowerCase() as 'approved' | 'pending' | 'rejected')}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(tr.languageCode)}
                  aria-label={tc('delete')}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {tr.subject && (
                <p className="text-sm">
                  <span className="font-medium">{t('subject')}: </span>
                  {tr.subject}
                </p>
              )}
              <p className="whitespace-pre-wrap rounded bg-muted px-3 py-2 text-sm">{tr.body}</p>
            </div>
          );
        })}
      </div>

      {/* Add translation form */}
      {showAdd ? (
        <div className="rounded-md border p-4 space-y-4">
          <h3 className="font-medium">{t('addTranslation')}</h3>

          <div className="space-y-2">
            <Label>{tc('common', { key: 'language' }) ?? 'Language'}</Label>
            <Select value={addingLang} onValueChange={setAddingLang}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name} ({l.code.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tr-subject">{t('subject')}</Label>
            <Input
              id="tr-subject"
              value={addingSubject}
              onChange={(e) => setAddingSubject(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tr-body">{t('body')}</Label>
            <textarea
              id="tr-body"
              required
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              value={addingBody}
              onChange={(e) => setAddingBody(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !addingLang || !addingBody}
            >
              {addMutation.isPending ? '…' : tc('save')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAdd(true)}
          disabled={availableLanguages.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('addTranslation')}
        </Button>
      )}
    </div>
  );
}
