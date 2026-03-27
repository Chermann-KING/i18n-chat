'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { bffGet, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

interface Language {
  code: string;
  name: string;
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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [fallbackLanguageCode, setFallbackLanguageCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: languages } = useQuery<Language[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<Language[]>(BFF_ROUTES.LANGUAGES.BASE),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => bffPost(BFF_ROUTES.TEMPLATES.BASE, { name, slug, fallbackLanguageCode }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setFallbackLanguageCode('');
      setError(null);
      onCreated();
    },
    onError: () => setError(tc('error')),
  });

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
            <Input id="tpl-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-slug">{t('slug')}</Label>
            <Input
              id="tpl-slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="my-template"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('fallbackLanguage')}</Label>
            <Select value={fallbackLanguageCode} onValueChange={setFallbackLanguageCode} required>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {languages?.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !fallbackLanguageCode}>
              {mutation.isPending ? '…' : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
