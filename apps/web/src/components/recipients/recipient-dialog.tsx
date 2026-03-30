'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguageSelect } from '@/components/ui/language-select';
import { PhoneInput } from '@/components/ui/phone-input';
import { bffDelete, bffGet, bffPatch, bffPost } from '@/lib/bff-client';
import { BFF_ROUTES } from '@/lib/constants/bff-routes';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from '@/lib/use-toast';

interface Language {
  code: string;
  label: string;
}

type ChannelType = 'EMAIL' | 'SMS' | 'WHATSAPP';

interface RecipientDetail {
  id: string;
  firstName: string;
  lastName: string;
  preferredLanguageCode: string;
  channels?: { id: string; channel: ChannelType; contact: string; isActive: boolean }[];
}

interface ChannelEntry {
  channel: ChannelType;
  contact: string;
  /** True when this channel already exists in the database (edit mode only). */
  isExisting?: boolean;
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
};

const CHANNEL_PLACEHOLDERS: Record<ChannelType, string> = {
  EMAIL: 'prenom.nom@exemple.be',
  SMS: '+32 470 00 00 00',
  WHATSAPP: '+32 470 00 00 00',
};

const ALL_CHANNEL_TYPES: ChannelType[] = ['EMAIL', 'SMS', 'WHATSAPP'];

interface RecipientDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When provided, the dialog opens in edit mode (PATCH). */
  editRecipient?: {
    id: string;
    firstName: string;
    lastName: string;
    preferredLanguageCode: string;
    channels?: ChannelEntry[];
  };
}

/**
 * Modal dialog for creating or editing a recipient.
 *
 * - Create mode: all fields editable, channels batched with creation.
 * - Edit mode: same fields + existing channels shown; additions and removals
 *   are applied as separate API calls when the user clicks Save.
 */
export function RecipientDialog({ open, onClose, onSaved, editRecipient }: RecipientDialogProps) {
  const t = useTranslations('recipients');
  const tc = useTranslations('common');

  const isEdit = editRecipient !== undefined;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  /** Channel types removed in edit mode — tracked for DELETE calls on Save. */
  const [removedTypes, setRemovedTypes] = useState<Set<ChannelType>>(new Set());
  const [newChannelType, setNewChannelType] = useState<ChannelType>('EMAIL');
  const [newChannelContact, setNewChannelContact] = useState('');
  const [newChannelPhoneValid, setNewChannelPhoneValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all form state when the dialog opens
  useEffect(() => {
    if (!open) return;
    setFirstName(editRecipient?.firstName ?? '');
    setLastName(editRecipient?.lastName ?? '');
    setLanguageCode(editRecipient?.preferredLanguageCode ?? '');
    setRemovedTypes(new Set());
    setChannels([]);
    setNewChannelType('EMAIL');
    setNewChannelContact('');
    setNewChannelPhoneValid(false);
    setError(null);
  }, [open, editRecipient]);

  const { data: languages } = useQuery<Language[]>({
    queryKey: QUERY_KEYS.languages.all(),
    queryFn: () => bffGet<Language[]>(BFF_ROUTES.LANGUAGES.BASE),
    enabled: open,
  });

  /**
   * In edit mode, fetch the full recipient details (including channels) fresh
   * from the API whenever the dialog opens. This avoids relying on whatever
   * partial data the list view has in memory.
   */
  const { data: recipientDetail } = useQuery<RecipientDetail>({
    queryKey: QUERY_KEYS.recipients.byId(editRecipient?.id ?? ''),
    queryFn: () => bffGet<RecipientDetail>(BFF_ROUTES.RECIPIENTS.BY_ID(editRecipient!.id)),
    enabled: open && isEdit,
    staleTime: 0,
  });

  // Once the full recipient details are fetched, populate the channels list
  useEffect(() => {
    if (!recipientDetail) return;
    const existing: ChannelEntry[] = (recipientDetail.channels ?? [])
      .filter((ch) => ch.isActive)
      .map((ch) => ({ channel: ch.channel, contact: ch.contact, isExisting: true }));
    setChannels(existing);
    const taken = new Set(existing.map((ch) => ch.channel));
    const first = ALL_CHANNEL_TYPES.find((t) => !taken.has(t)) ?? 'EMAIL';
    setNewChannelType(first);
  }, [recipientDetail]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const id = editRecipient!.id;
        // 1. Update basic profile fields
        await bffPatch(BFF_ROUTES.RECIPIENTS.BY_ID(id), {
          firstName,
          lastName,
          preferredLanguageCode: languageCode,
        });
        // 2. Remove deleted channels
        if (removedTypes.size > 0) {
          await Promise.all(
            [...removedTypes].map((type) =>
              bffDelete(BFF_ROUTES.RECIPIENTS.CHANNEL(id, type)),
            ),
          );
        }
        // 3. Add new channels (those not already in DB)
        const toAdd = channels.filter((ch) => !ch.isExisting);
        if (toAdd.length > 0) {
          await Promise.all(
            toAdd.map((ch) =>
              bffPost(BFF_ROUTES.RECIPIENTS.CHANNELS(id), {
                channel: ch.channel,
                contact: ch.contact,
              }),
            ),
          );
        }
      } else {
        await bffPost(BFF_ROUTES.RECIPIENTS.BASE, {
          firstName,
          lastName,
          preferredLanguageCode: languageCode,
          channels: channels.length > 0 ? channels.map(({ channel, contact }) => ({ channel, contact })) : undefined,
        });
      }
    },
    onSuccess: () => {
      setError(null);
      toast({
        title: isEdit
          ? t('updateSuccess', { firstName, lastName })
          : t('createSuccess', { firstName, lastName }),
        variant: 'success',
      });
      onSaved();
    },
    onError: () => setError(tc('error')),
  });

  const isPhoneChannel = newChannelType === 'SMS' || newChannelType === 'WHATSAPP';

  function addChannel() {
    if (!newChannelContact.trim()) return;
    if (isPhoneChannel && !newChannelPhoneValid) return;
    if (channels.some((c) => c.channel === newChannelType)) return;
    setChannels((prev) => [...prev, { channel: newChannelType, contact: newChannelContact.trim() }]);
    setNewChannelContact('');
    setNewChannelPhoneValid(false);
    // Advance selector to next available type
    const taken = new Set([...channels.map((c) => c.channel), newChannelType]);
    const next = ALL_CHANNEL_TYPES.find((t) => !taken.has(t));
    if (next) setNewChannelType(next);
  }

  function removeChannel(type: ChannelType) {
    const entry = channels.find((c) => c.channel === type);
    if (entry?.isExisting) {
      setRemovedTypes((prev) => new Set([...prev, type]));
    }
    setChannels((prev) => prev.filter((c) => c.channel !== type));
    // Make the removed type available again in the selector
    setNewChannelType(type);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const availableChannelTypes = ALL_CHANNEL_TYPES.filter(
    (type) => !channels.some((c) => c.channel === type),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? tc('edit') : t('add')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* First name + Last name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipient-firstName">{t('firstName')}</Label>
              <Input
                id="recipient-firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-lastName">{t('lastName')}</Label>
              <Input
                id="recipient-lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Preferred language */}
          <div className="space-y-2">
            <Label>{t('preferredLanguage')}</Label>
            <LanguageSelect
              languages={languages ?? []}
              value={languageCode}
              onValueChange={setLanguageCode}
              required
            />
          </div>

          {/* Channels — shown in both create and edit mode */}
          <div className="space-y-2">
            <Label>{t('channels')}</Label>

            {/* Current channels list */}
            {channels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {channels.map((ch) => (
                  <div
                    key={ch.channel}
                    className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                  >
                    <Badge variant="outline" className="text-xs">
                      {CHANNEL_LABELS[ch.channel]}
                    </Badge>
                    <span className="text-muted-foreground">{ch.contact}</span>
                    <button
                      type="button"
                      onClick={() => removeChannel(ch.channel)}
                      className="ml-1 text-destructive hover:text-destructive/80"
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add channel row — only shown when slots remain */}
            {availableChannelTypes.length > 0 && (
              <div className="flex gap-2">
                <Select
                  value={newChannelType}
                  onValueChange={(v) => {
                    setNewChannelType(v as ChannelType);
                    setNewChannelContact('');
                    setNewChannelPhoneValid(false);
                  }}
                >
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CHANNEL_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isPhoneChannel ? (
                  <PhoneInput
                    value={newChannelContact}
                    onChange={(e164, valid) => {
                      setNewChannelContact(e164);
                      setNewChannelPhoneValid(valid);
                    }}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    placeholder={CHANNEL_PLACEHOLDERS[newChannelType]}
                    value={newChannelContact}
                    onChange={(e) => setNewChannelContact(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChannel(); } }}
                  />
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addChannel}
                  disabled={
                    !newChannelContact.trim() ||
                    (isPhoneChannel && !newChannelPhoneValid)
                  }
                >
                  +
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !firstName.trim() ||
                !lastName.trim() ||
                !languageCode
              }
            >
              {mutation.isPending ? '…' : isEdit ? tc('save') : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
