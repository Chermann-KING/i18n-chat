import { z } from 'zod';
import { MessageChannel } from '@i18n-chat/domain';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/** Schema for a single channel entry when creating or updating a recipient. */
export const RecipientChannelInputSchema = z.object({
  channel: z.nativeEnum(MessageChannel),
  /**
   * Plain-text contact value (email address or E.164 phone number).
   * Encrypted at rest before persistence.
   */
  contact: z.string().min(1),
});

/** Schema for a channel entry in API responses. Contact is masked/redacted. */
export const RecipientChannelResponseSchema = z.object({
  id: z.string().uuid(),
  channel: z.nativeEnum(MessageChannel),
  /** Masked value — never exposes the plaintext contact in API responses. */
  contact: z.string(),
  isActive: z.boolean(),
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for creating a new recipient. */
export const CreateRecipientSchema = z.object({
  /** Full name of the recipient, e.g. `'Amina Benali'`. */
  fullName: z.string().min(1).max(200),
  /** ISO 639-1 code of the recipient's preferred language. */
  preferredLanguageCode: z.string().min(2).max(10),
  /** Optional list of contact channels to register at creation time. */
  channels: z.array(RecipientChannelInputSchema).optional(),
});

/** Validation schema for updating an existing recipient. */
export const UpdateRecipientSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  preferredLanguageCode: z.string().min(2).max(10).optional(),
  isActive: z.boolean().optional(),
});

/** Validation schema for adding a single channel to a recipient. */
export const AddChannelSchema = z.object({
  channel: z.nativeEnum(MessageChannel),
  contact: z.string().min(1),
});

/** Schema for the recipient object returned by the API. */
export const RecipientResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  preferredLanguageCode: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  channels: z.array(RecipientChannelResponseSchema).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateRecipientSchema} */
export type TCreateRecipient = z.infer<typeof CreateRecipientSchema>;

/** @see {@link UpdateRecipientSchema} */
export type TUpdateRecipient = z.infer<typeof UpdateRecipientSchema>;

/** @see {@link AddChannelSchema} */
export type TAddChannel = z.infer<typeof AddChannelSchema>;

/** @see {@link RecipientResponseSchema} */
export type TRecipientResponse = z.infer<typeof RecipientResponseSchema>;

/** @see {@link RecipientChannelResponseSchema} */
export type TRecipientChannelResponse = z.infer<typeof RecipientChannelResponseSchema>;
