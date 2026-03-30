'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useMessages } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguageSelect } from '@/components/ui/language-select';
import { bffGet, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface Language {
  code: string;
  label: string;
}

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Modal dialog for creating a new message template.
 */
export function TemplateDialog({ open, onClose, onCreated }: TemplateDialogProps) {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const messages = useMessages();
  const categoryLabels = (messages.templates as { categories: Record<string, string> }).categories;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [category, setCategory] = useState('');
  const [fallbackLanguageCode, setFallbackLanguageCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  const { data: languages } = useQuery<Language[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<Language[]>(BFF_ROUTES.LANGUAGES.BASE),
    enabled: open,
  });

  const { data: categories } = useQuery<string[]>({
    queryKey: QUERY_KEYS.templates.categories(),
    queryFn: () => bffGet<string[]>(BFF_ROUTES.TEMPLATES.CATEGORIES),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => bffPost(BFF_ROUTES.TEMPLATES.BASE, { name, slug, category, fallbackLanguageCode }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setSlugEdited(false);
      setCategory('');
      setFallbackLanguageCode('');
      setError(null);
      onCreated();
    },
    onError: (err: unknown) => {
      const status = (err as { status?: number })?.status;
      setError(status === 409 ? t('slugConflict', { slug }) : tc('error'));
    },
  });

  const canSubmit = !!name && !!fallbackLanguageCode && !!category;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('add')}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="tpl-name">{t('name')}</Label>
            <Input
              id="tpl-name"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                {t('slug')} : <span className="font-mono">{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('fallbackLanguage')}</Label>
            <LanguageSelect
              languages={languages ?? []}
              value={fallbackLanguageCode}
              onValueChange={setFallbackLanguageCode}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending ? '…' : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
