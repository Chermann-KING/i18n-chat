'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useMessages } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bffGet, bffPost, BffError } from '@/lib/bff-client';
import { toast } from '@/lib/use-toast';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { useDispatchWizardStore } from '@/lib/stores/dispatch-wizard.store';
import type { WizardStep } from '@/lib/stores/dispatch-wizard.store';

/** Wizard steps in order. */
const STEPS: WizardStep[] = ['template', 'variables', 'recipients', 'review'];

interface TemplateVariable {
  key: string;
  label: string;
  type?: string;
  source?: string;
  isRequired: boolean;
  defaultValue?: string;
}

interface TemplateTranslation {
  languageCode: string;
  name?: string | null;
  variableLabels?: Record<string, string> | null;
}

interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  variables?: TemplateVariable[];
  translations?: TemplateTranslation[];
}

interface TemplatesPage {
  data: Template[];
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  preferredLanguageCode: string;
}

interface RecipientsPage {
  data: Recipient[];
}

interface DispatchWizardProps {
  locale: string;
}

/**
 * Multi-step dispatch wizard.
 * Steps: choose template → fill variables → choose recipients → review + send.
 */
export function DispatchWizard({ locale }: DispatchWizardProps) {
  const t = useTranslations('dispatches');
  const tc = useTranslations('common');
  const messages = useMessages();
  const categoryLabels =
    ((messages.templates as Record<string, unknown>)?.categories as Record<string, string>) ?? {};
  const displayNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );
  const router = useRouter();

  const {
    step,
    selectedTemplateId,
    variables,
    selectedRecipientIds,
    recipientSearch,
    selectedChannels,
    setStep,
    setSelectedTemplateId,
    setVariables,
    setSelectedRecipientIds,
    setRecipientSearch,
    setSelectedChannels,
    reset,
  } = useDispatchWizardStore();

  const { data: templates } = useQuery<TemplatesPage>({
    queryKey: QUERY_KEYS.templates.all(),
    queryFn: () =>
      bffGet<TemplatesPage>(
        `${BFF_ROUTES.TEMPLATES.BASE}?includeVariables=true&includeTranslations=true`,
      ),
  });

  const { data: recipients } = useQuery<RecipientsPage>({
    queryKey: QUERY_KEYS.recipients.all(),
    queryFn: () => bffGet<RecipientsPage>(BFF_ROUTES.RECIPIENTS.BASE),
    enabled: step === 'recipients' || step === 'review',
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      bffPost(BFF_ROUTES.DISPATCHES.BASE, {
        recipientMode: 'REGISTERED',
        templateId: selectedTemplateId,
        channels: selectedChannels,
        globalVariables: variables,
        recipientIds: selectedRecipientIds,
      }),
    onSuccess: (data: unknown) => {
      const dispatch = data as { id: string };
      reset();
      router.push(`/${locale}/dispatches/${dispatch.id}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof BffError ? err.message : tc('error');
      toast({ title: t('sendError'), description: message, variant: 'destructive' });
    },
  });

  const stepIndex = STEPS.indexOf(step);
  const selectedTemplate = templates?.data.find((tpl) => tpl.id === selectedTemplateId);

  const activeTranslation = selectedTemplate?.translations?.find(
    (tr) => tr.languageCode === locale,
  );
  const manualVars =
    selectedTemplate?.variables?.filter((v) => v.source !== 'RECIPIENT_FIELD') ?? [];
  const requiredKeys = manualVars.filter((v) => v.isRequired).map((v) => v.key);

  function getVarLabel(key: string, fallback: string): string {
    return activeTranslation?.variableLabels?.[key] ?? fallback;
  }

  const canProceed =
    step === 'template'
      ? !!selectedTemplateId
      : step === 'variables'
        ? requiredKeys.every((k) => variables[k]?.trim())
        : step === 'recipients'
          ? selectedRecipientIds.length > 0
          : selectedChannels.length > 0;

  function toggleRecipient(id: string) {
    setSelectedRecipientIds(
      selectedRecipientIds.includes(id)
        ? selectedRecipientIds.filter((rid) => rid !== id)
        : [...selectedRecipientIds, id],
    );
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i <= stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i === stepIndex ? 'font-semibold' : 'text-muted-foreground'}`}
            >
              {t(`step.${s}`)}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
          </div>
        ))}
      </nav>

      {/* Step 1 — choose template */}
      {step === 'template' && (
        <div className="space-y-3">
          {templates?.data.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setSelectedTemplateId(tpl.id);
                const initial: Record<string, string> = {};
                tpl.variables
                  ?.filter((v) => v.source !== 'RECIPIENT_FIELD')
                  .forEach((v) => {
                    initial[v.key] = v.defaultValue ?? '';
                  });
                setVariables(initial);
              }}
              className={`w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/50 ${
                selectedTemplateId === tpl.id ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <p className="font-medium">
                {tpl.translations?.find((tr) => tr.languageCode === locale)?.name ?? tpl.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {categoryLabels[tpl.category] ?? tpl.category}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — fill variables */}
      {step === 'variables' && (
        <div className="space-y-4">
          {manualVars.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noManualVariables')}</p>
          ) : (
            <VariableEditor
              variables={variables}
              declaredKeys={manualVars.map((v) => ({
                key: v.key,
                label: getVarLabel(v.key, v.label),
                type: v.type ?? 'TEXT',
                isRequired: v.isRequired,
              }))}
              onChange={setVariables}
            />
          )}
        </div>
      )}

      {/* Step 3 — choose recipients */}
      {step === 'recipients' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={tc('search')}
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filtered = (recipients?.data ?? []).filter((r) => {
                  const q = recipientSearch.toLowerCase();
                  return (
                    !q ||
                    `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
                    r.preferredLanguageCode.includes(q)
                  );
                });
                const allSelected = filtered.every((r) => selectedRecipientIds.includes(r.id));
                if (allSelected) {
                  setSelectedRecipientIds(
                    selectedRecipientIds.filter((id) => !filtered.some((r) => r.id === id)),
                  );
                } else {
                  setSelectedRecipientIds([
                    ...new Set([...selectedRecipientIds, ...filtered.map((r) => r.id)]),
                  ]);
                }
              }}
            >
              {t('selectAll')}
            </Button>
          </div>
          {(recipients?.data ?? [])
            .filter((r) => {
              const q = recipientSearch.toLowerCase();
              return (
                !q ||
                `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
                r.preferredLanguageCode.includes(q)
              );
            })
            .map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRecipient(r.id)}
                className={`flex w-full items-center gap-3 rounded-md border p-4 transition-colors hover:bg-muted/50 ${
                  selectedRecipientIds.includes(r.id) ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selectedRecipientIds.includes(r.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40'
                  }`}
                >
                  {selectedRecipientIds.includes(r.id) && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <p className="flex-1 text-left font-medium">
                  {r.firstName} {r.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const name =
                      displayNames.of(r.preferredLanguageCode) ?? r.preferredLanguageCode;
                    return name.charAt(0).toUpperCase() + name.slice(1);
                  })()}
                </p>
              </button>
            ))}
          {recipients && recipients.data.length === 0 && (
            <p className="text-sm text-muted-foreground">{tc('noResults')}</p>
          )}
        </div>
      )}

      {/* Step 4 — review */}
      {step === 'review' && (
        <div className="space-y-4 rounded-md border p-6">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('template')}</p>
            <p className="font-semibold">
              {selectedTemplate?.translations?.find((tr) => tr.languageCode === locale)?.name ??
                selectedTemplate?.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('variables')}</p>
            {manualVars.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1">
                {manualVars.map((v) => {
                  const label = getVarLabel(v.key, v.label);
                  const raw = variables[v.key] ?? '';
                  let display = raw;
                  if (raw && v.type === 'DATE') {
                    try {
                      display = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                        new Date(raw),
                      );
                    } catch {
                      display = raw;
                    }
                  } else if (raw && v.type === 'TIME') {
                    try {
                      display = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(
                        new Date(`1970-01-01T${raw}`),
                      );
                    } catch {
                      display = raw;
                    }
                  }
                  return (
                    <li key={v.key} className="text-sm">
                      <span className="font-medium">{label}</span>
                      {display ? (
                        <span className="text-muted-foreground"> : {display}</span>
                      ) : (
                        <span className="text-muted-foreground/50"> —</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('recipients')}</p>
            <p className="text-sm">
              {t('recipientsSelected', { count: selectedRecipientIds.length })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('channels')}</p>
            <div className="mt-1 flex flex-wrap gap-4">
              {(['EMAIL', 'SMS', 'WHATSAPP'] as const).map((ch) => (
                <div key={ch} className="flex items-center gap-2">
                  <Checkbox
                    id={`ch-${ch}`}
                    checked={selectedChannels.includes(ch)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...selectedChannels, ch]
                        : selectedChannels.filter((c) => c !== ch);
                      setSelectedChannels(next);
                    }}
                  />
                  <Label htmlFor={`ch-${ch}`} className="cursor-pointer">
                    {t(`channel${ch}` as 'channelEMAIL' | 'channelSMS' | 'channelWHATSAPP')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(STEPS[stepIndex - 1])}
          disabled={stepIndex === 0}
        >
          {tc('back')}
        </Button>

        {step !== 'review' ? (
          <Button onClick={() => setStep(STEPS[stepIndex + 1])} disabled={!canProceed}>
            {t('next')}
          </Button>
        ) : (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={
              sendMutation.isPending ||
              selectedRecipientIds.length === 0 ||
              selectedChannels.length === 0
            }
          >
            {sendMutation.isPending ? '…' : t('send')}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Today's date in YYYY-MM-DD format — used as `min` on date inputs. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inline variable editor — declared variables shown as labelled inputs, extras can be added. */
function VariableEditor({
  variables,
  declaredKeys,
  onChange,
}: {
  variables: Record<string, string>;
  declaredKeys: { key: string; label: string; type?: string; isRequired?: boolean }[];
  onChange: (v: Record<string, string>) => void;
}) {
  const todayStr = today();

  function updateValue(k: string, val: string) {
    onChange({ ...variables, [k]: val });
  }

  return (
    <div className="space-y-4">
      {declaredKeys.map(({ key, label, type, isRequired }) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`var-${key}`}>
            {label}
            {isRequired && (
              <span className="ml-1 text-destructive" aria-hidden>
                *
              </span>
            )}
            <span className="ml-2 font-mono text-xs text-muted-foreground">{`{{${key}}}`}</span>
          </Label>
          {type === 'DATE' ? (
            <Input
              id={`var-${key}`}
              type="date"
              min={todayStr}
              value={variables[key] ?? ''}
              onChange={(e) => updateValue(key, e.target.value)}
            />
          ) : type === 'TIME' ? (
            <Input
              id={`var-${key}`}
              type="time"
              value={variables[key] ?? ''}
              onChange={(e) => updateValue(key, e.target.value)}
            />
          ) : type === 'NUMBER' ? (
            <Input
              id={`var-${key}`}
              type="number"
              value={variables[key] ?? ''}
              onChange={(e) => updateValue(key, e.target.value)}
            />
          ) : (
            <Input
              id={`var-${key}`}
              value={variables[key] ?? ''}
              onChange={(e) => updateValue(key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
