'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { bffGet, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/** Wizard steps in order. */
const STEPS = ['template', 'variables', 'recipients', 'review'] as const;
type Step = (typeof STEPS)[number];

interface Template {
  id: string;
  name: string;
  slug: string;
}

interface TemplatesPage {
  data: Template[];
}

interface Recipient {
  id: string;
  name: string;
  preferredLanguage: { code: string };
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
  const router = useRouter();

  const [step, setStep] = useState<Step>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  const { data: templates } = useQuery<TemplatesPage>({
    queryKey: QUERY_KEYS.templates.all(),
    queryFn: () => bffGet<TemplatesPage>(BFF_ROUTES.TEMPLATES.BASE),
  });

  const { data: recipients } = useQuery<RecipientsPage>({
    queryKey: QUERY_KEYS.recipients.all(),
    queryFn: () => bffGet<RecipientsPage>(BFF_ROUTES.RECIPIENTS.BASE),
    enabled: step === 'recipients' || step === 'review',
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      bffPost(BFF_ROUTES.DISPATCHES.BASE, {
        templateId: selectedTemplateId,
        variables,
        recipientIds: selectedRecipientIds,
      }),
    onSuccess: (data: unknown) => {
      const dispatch = data as { id: string };
      router.push(`/${locale}/dispatches/${dispatch.id}`);
    },
  });

  const stepIndex = STEPS.indexOf(step);
  const selectedTemplate = templates?.data.find((tpl) => tpl.id === selectedTemplateId);

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
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
              onClick={() => setSelectedTemplateId(tpl.id)}
              className={`w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/50 ${
                selectedTemplateId === tpl.id ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <p className="font-medium">{tpl.name}</p>
              <p className="font-mono text-sm text-muted-foreground">{tpl.slug}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — fill variables */}
      {step === 'variables' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add variables used in the template body (e.g. <code>{'{{name}}'}</code>).
          </p>
          <VariableEditor variables={variables} onChange={setVariables} />
        </div>
      )}

      {/* Step 3 — choose recipients */}
      {step === 'recipients' && (
        <div className="space-y-3">
          {recipients?.data.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleRecipient(r.id)}
              className={`flex w-full items-center justify-between rounded-md border p-4 transition-colors hover:bg-muted/50 ${
                selectedRecipientIds.includes(r.id) ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-sm uppercase text-muted-foreground">
                  {r.preferredLanguage.code}
                </p>
              </div>
              {selectedRecipientIds.includes(r.id) && <Badge variant="default">✓</Badge>}
            </button>
          ))}
        </div>
      )}

      {/* Step 4 — review */}
      {step === 'review' && (
        <div className="space-y-4 rounded-md border p-6">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('template')}</p>
            <p className="font-semibold">{selectedTemplate?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Variables</p>
            {Object.keys(variables).length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1">
                {Object.entries(variables).map(([k, v]) => (
                  <li key={k} className="text-sm">
                    <span className="font-mono">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('recipients')}</p>
            <p className="text-sm">{selectedRecipientIds.length} recipient(s) selected</p>
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
          <Button
            onClick={() => setStep(STEPS[stepIndex + 1])}
            disabled={step === 'template' && !selectedTemplateId}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || selectedRecipientIds.length === 0}
          >
            {sendMutation.isPending ? '…' : t('new')}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Inline key-value editor for template variables. */
function VariableEditor({
  variables,
  onChange,
}: {
  variables: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  function add() {
    if (!key.trim()) return;
    onChange({ ...variables, [key.trim()]: value });
    setKey('');
    setValue('');
  }

  function remove(k: string) {
    const next = { ...variables };
    delete next[k];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {Object.entries(variables).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="font-mono text-sm w-32 shrink-0">{k}</span>
          <span className="flex-1 text-sm">{v}</span>
          <Button variant="ghost" size="icon" onClick={() => remove(k)}>
            ×
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <div className="space-y-1 flex-1">
          <Label htmlFor="var-key">Key</Label>
          <Input
            id="var-key"
            placeholder="name"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div className="space-y-1 flex-1">
          <Label htmlFor="var-value">Value</Label>
          <Input
            id="var-value"
            placeholder="John"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={add} disabled={!key.trim()}>
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
