'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { LanguageSelect } from '@/components/ui/language-select';
import { dirAttr } from '@/lib/rtl';
import { bffGet, bffPost, bffPatch, bffDelete } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface Language {
  code: string;
  label: string;
}

type VariableType = 'TEXT' | 'NUMBER' | 'DATE' | 'TIME';
type VariableSource = 'MANUAL' | 'RECIPIENT_FIELD';
type RecipientFieldValue = 'firstName' | 'lastName';

interface TemplateVariable {
  id: string;
  key: string;
  label: string;
  type: VariableType;
  source: VariableSource;
  recipientField?: RecipientFieldValue | null;
  isRequired: boolean;
  defaultValue?: string;
}

interface TemplateTranslation {
  languageCode: string;
  name: string | null;
  subject: string | null;
  body: string;
  variableLabels?: Record<string, string> | null;
  waTemplateStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
}

interface TemplateDetail {
  id: string;
  name: string;
  slug: string;
  fallbackLanguageCode: string;
  variables?: TemplateVariable[];
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
  // Variable form state
  const [showAddVar, setShowAddVar] = useState(false);
  const [varKey, setVarKey] = useState('');
  const [varLabel, setVarLabel] = useState('');
  const [varType, setVarType] = useState<VariableType>('TEXT');
  const [varSource, setVarSource] = useState<VariableSource>('MANUAL');
  const [varRecipientField, setVarRecipientField] = useState<RecipientFieldValue>('firstName');
  const [varRequired, setVarRequired] = useState(true);
  const [varDefault, setVarDefault] = useState('');

  // Translation form state
  const [addingLang, setAddingLang] = useState('');
  const [addingName, setAddingName] = useState('');
  const [addingSubject, setAddingSubject] = useState('');
  const [addingBody, setAddingBody] = useState('');
  const [addingVariableLabels, setAddingVariableLabels] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);

  // Edit translation state
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editVariableLabels, setEditVariableLabels] = useState<Record<string, string>>({});

  const { data: tpl, isLoading } = useQuery<TemplateDetail>({
    queryKey: QUERY_KEYS.templates.byId(templateId),
    queryFn: () => bffGet<TemplateDetail>(BFF_ROUTES.TEMPLATES.BY_ID(templateId)),
  });

  useEffect(() => {
    if (tpl && !addingLang) setAddingLang(tpl.fallbackLanguageCode);
  }, [tpl]);

  const { data: languages } = useQuery<Language[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<Language[]>(BFF_ROUTES.LANGUAGES.BASE),
  });

  const addVariableMutation = useMutation({
    mutationFn: () => {
      const isDuplicate = (tpl?.variables ?? []).some((v) => v.key === varKey.trim());
      if (isDuplicate) return Promise.reject({ status: 409 });
      return bffPost(BFF_ROUTES.TEMPLATES.VARIABLES(templateId), {
        key: varKey.trim(),
        label: varLabel.trim(),
        type: varType,
        source: varSource,
        recipientField: varSource === 'RECIPIENT_FIELD' ? varRecipientField : undefined,
        isRequired: varRequired,
        defaultValue: varDefault.trim() || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
      setShowAddVar(false);
      setVarKey('');
      setVarLabel('');
      setVarType('TEXT');
      setVarSource('MANUAL');
      setVarRecipientField('firstName');
      setVarRequired(true);
      setVarDefault('');
      toast({ title: t('addVariableSuccess'), variant: 'success' });
    },
    onError: (err: unknown) => {
      const isDuplicate =
        (err as { status?: number })?.status === 409 ||
        (err as { status?: number })?.status === 400;
      toast({
        title: isDuplicate
          ? t('variableKeyDuplicate', { key: varKey.trim() })
          : tc('error'),
        variant: 'destructive',
      });
    },
  });

  const deleteVariableMutation = useMutation({
    mutationFn: (variableId: string) =>
      bffDelete(BFF_ROUTES.TEMPLATES.VARIABLE(templateId, variableId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
      toast({ title: t('deleteVariableSuccess'), variant: 'success' });
    },
    onError: () => {
      toast({ title: tc('error'), variant: 'destructive' });
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      bffPost(BFF_ROUTES.TEMPLATES.TRANSLATIONS(templateId), {
        languageCode: addingLang,
        name: addingName.trim() || undefined,
        subject: addingSubject || null,
        body: addingBody,
        variableLabels: Object.keys(addingVariableLabels).length > 0 ? addingVariableLabels : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
      setShowAdd(false);
      setAddingName('');
      setAddingSubject('');
      setAddingBody('');
      setAddingVariableLabels({});
      toast({ title: t('addTranslationSuccess'), variant: 'success' });
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      bffPatch(BFF_ROUTES.TEMPLATES.TRANSLATION(templateId, editingLang!), {
        name: editName.trim() || undefined,
        subject: editSubject || null,
        body: editBody,
        variableLabels: Object.keys(editVariableLabels).length > 0 ? editVariableLabels : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.templates.byId(templateId) });
      setEditingLang(null);
      toast({ title: t('addTranslationSuccess'), variant: 'success' });
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

      {/* Variables section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t('variables')}</h3>
          {!showAddVar && (
            <Button variant="outline" size="sm" onClick={() => setShowAddVar(true)}>
              <Plus className="mr-1 h-3 w-3" />
              {t('addVariable')}
            </Button>
          )}
        </div>

        {/* Existing variables */}
        {(tpl.variables ?? []).length > 0 && (
          <div className="rounded-md border divide-y">
            {tpl.variables!.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{`{{${v.key}}}`}</span>
                    <Badge variant="secondary" className="text-xs">
                      {t(`variableType${v.type}` as 'variableTypeTEXT' | 'variableTypeNUMBER' | 'variableTypeDATE' | 'variableTypeTIME')}
                    </Badge>
                    {v.source === 'RECIPIENT_FIELD' && (
                      <Badge variant="outline" className="text-xs text-blue-600">
                        {t('variableSourceRecipientField')}{v.recipientField ? ` (${t(v.recipientField === 'firstName' ? 'variableFieldFirstName' : 'variableFieldLastName')})` : ''}
                      </Badge>
                    )}
                    {v.isRequired && (
                      <Badge variant="outline" className="text-xs">
                        {t('variableRequired')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{v.label}</p>
                  {v.defaultValue && (
                    <p className="text-xs text-muted-foreground">
                      {t('variableDefault')}: {v.defaultValue}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteVariableMutation.mutate(v.id)}
                  aria-label={tc('delete')}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add variable form */}
        {showAddVar && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="var-key">{t('variableKey')}</Label>
                <Input
                  id="var-key"
                  placeholder="prenom"
                  value={varKey}
                  onChange={(e) => setVarKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="var-label">{t('variableLabel')}</Label>
                <Input
                  id="var-label"
                  placeholder="Prénom du destinataire"
                  value={varLabel}
                  onChange={(e) => setVarLabel(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('variableSource')}</Label>
              <Select value={varSource} onValueChange={(v) => setVarSource(v as VariableSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">{t('variableSourceManual')}</SelectItem>
                  <SelectItem value="RECIPIENT_FIELD">{t('variableSourceRecipientField')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {varSource === 'RECIPIENT_FIELD' && (
              <div className="space-y-1">
                <Label>{t('variableRecipientField')}</Label>
                <Select value={varRecipientField} onValueChange={(v) => setVarRecipientField(v as RecipientFieldValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firstName">{t('variableFieldFirstName')}</SelectItem>
                    <SelectItem value="lastName">{t('variableFieldLastName')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>{t('variableType')}</Label>
              <Select value={varType} onValueChange={(v) => setVarType(v as VariableType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">{t('variableTypeTEXT')}</SelectItem>
                  <SelectItem value="NUMBER">{t('variableTypeNUMBER')}</SelectItem>
                  <SelectItem value="DATE">{t('variableTypeDATE')}</SelectItem>
                  <SelectItem value="TIME">{t('variableTypeTIME')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-default">{t('variableDefault')}</Label>
              <Input
                id="var-default"
                value={varDefault}
                onChange={(e) => setVarDefault(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="var-required"
                checked={varRequired}
                onCheckedChange={(v) => setVarRequired(v === true)}
              />
              <Label htmlFor="var-required">{t('variableRequired')}</Label>
            </div>
            {varKey && (
              <p className="text-xs text-muted-foreground font-mono">{`{{${varKey}}}`}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddVar(false)}>{tc('cancel')}</Button>
              <Button
                onClick={() => addVariableMutation.mutate()}
                disabled={addVariableMutation.isPending || !varKey.trim() || !varLabel.trim()}
              >
                {addVariableMutation.isPending ? '…' : tc('add')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Translations list */}
      <div className="space-y-3">
        {tpl.translations.map((tr) => {
          const waVariant =
            tr.waTemplateStatus === 'APPROVED'
              ? 'success'
              : tr.waTemplateStatus === 'REJECTED'
                ? 'destructive'
                : 'warning';

          return (
            <div key={tr.languageCode} className="rounded-md border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase">{tr.languageCode}</span>
                  {tr.name && (
                    <span className="text-sm font-medium">{tr.name}</span>
                  )}
                  {tr.waTemplateStatus && tr.waTemplateStatus !== 'NOT_SUBMITTED' && (
                    <Badge variant={waVariant}>
                      {t(tr.waTemplateStatus.toLowerCase() as 'approved' | 'pending' | 'rejected')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingLang(tr.languageCode);
                      setEditName(tr.name ?? '');
                      setEditSubject(tr.subject ?? '');
                      setEditBody(tr.body);
                      setEditVariableLabels(tr.variableLabels ?? {});
                    }}
                    aria-label={tc('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(tr.languageCode)}
                    aria-label={tc('delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingLang === tr.languageCode ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor={`edit-name-${tr.languageCode}`}>{t('translationName')}</Label>
                    <Input
                      id={`edit-name-${tr.languageCode}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`edit-subject-${tr.languageCode}`}>{t('subject')}</Label>
                    <Input
                      id={`edit-subject-${tr.languageCode}`}
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`edit-body-${tr.languageCode}`}>{t('body')}</Label>
                    <textarea
                      id={`edit-body-${tr.languageCode}`}
                      rows={6}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                  </div>
                  {(tpl?.variables ?? []).filter((v) => v.source !== 'RECIPIENT_FIELD').length > 0 && (
                    <div className="space-y-3">
                      <Label>{t('variableLabels')}</Label>
                      {(tpl?.variables ?? []).filter((v) => v.source !== 'RECIPIENT_FIELD').map((v) => (
                        <div key={v.key} className="space-y-1">
                          <Label htmlFor={`edit-label-${v.key}`} className="text-sm text-muted-foreground">
                            <span className="font-mono">{`{{${v.key}}}`}</span>
                            <span className="ml-2 text-xs">({v.label})</span>
                          </Label>
                          <Input
                            id={`edit-label-${v.key}`}
                            value={editVariableLabels[v.key] ?? ''}
                            onChange={(e) => setEditVariableLabels((prev) => ({ ...prev, [v.key]: e.target.value }))}
                            placeholder={v.label}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditingLang(null)}>{tc('cancel')}</Button>
                    <Button
                      onClick={() => editMutation.mutate()}
                      disabled={editMutation.isPending || !editBody.trim()}
                    >
                      {editMutation.isPending ? '…' : tc('save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {tr.subject && (
                    <div className="flex gap-2 items-baseline text-sm">
                      <span className="font-medium shrink-0">{t('subject')}:</span>
                      <span dir={dirAttr(tr.languageCode)} lang={tr.languageCode} className="flex-1">
                        {tr.subject}
                      </span>
                    </div>
                  )}
                  <p
                    className="whitespace-pre-wrap rounded bg-muted px-3 py-2 text-sm"
                    dir={dirAttr(tr.languageCode)}
                    lang={tr.languageCode}
                  >
                    {tr.body}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add translation form */}
      {showAdd ? (
        <div className="rounded-md border p-4 space-y-4">
          <h3 className="font-medium">{t('addTranslation')}</h3>

          <div className="space-y-2">
            <Label>{t('language')}</Label>
            <LanguageSelect
              languages={availableLanguages}
              value={addingLang}
              onValueChange={setAddingLang}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tr-name">{t('translationName')}</Label>
            <Input
              id="tr-name"
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              placeholder={tpl?.name}
            />
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

          {(tpl?.variables ?? []).filter((v) => v.source !== 'RECIPIENT_FIELD').length > 0 && (
            <div className="space-y-3">
              <Label>{t('variableLabels')}</Label>
              {(tpl?.variables ?? []).filter((v) => v.source !== 'RECIPIENT_FIELD').map((v) => (
                <div key={v.key} className="space-y-1">
                  <Label htmlFor={`tr-label-${v.key}`} className="text-sm text-muted-foreground">
                    <span className="font-mono">{`{{${v.key}}}`}</span>
                    <span className="ml-2 text-xs">({v.label})</span>
                  </Label>
                  <Input
                    id={`tr-label-${v.key}`}
                    value={addingVariableLabels[v.key] ?? ''}
                    onChange={(e) => setAddingVariableLabels((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.label}
                  />
                </div>
              ))}
            </div>
          )}

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
