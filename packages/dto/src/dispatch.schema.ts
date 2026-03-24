import { z } from 'zod';
import { DispatchStatus, MessageChannel, RecipientMode } from '@i18n-chat/domain';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Schema for a single anonymous dispatch target.
 * Used when `recipientMode` is `ANONYMOUS`.
 */
export const DispatchTargetSchema = z.object({
  channel: z.nativeEnum(MessageChannel),
  /**
   * Plain-text contact value (email address or E.164 phone number).
   * Encrypted at rest before persistence.
   */
  contact: z.string().min(1),
  /** ISO 639-1 code of the language to use for this target. */
  languageCode: z.string().min(2).max(10),
  /**
   * Handlebars variable values for this specific target,
   * e.g. `{ "prenom": "Amina", "date": "30/03/2026" }`.
   */
  variables: z.record(z.string()).default({}),
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Validation schema for creating a new dispatch.
 *
 * - When `recipientMode` is `REGISTERED`: provide `recipientIds` and optionally `templateId`.
 * - When `recipientMode` is `ANONYMOUS`: provide `targets` with per-target contact + variables.
 * - Exactly one of `templateId` or `freeTextOriginal` must be provided.
 */
export const CreateDispatchSchema = z.object({
  recipientMode: z.nativeEnum(RecipientMode),
  /** UUID of the template to use. Mutually exclusive with `freeTextOriginal`. */
  templateId: z.string().uuid().optional(),
  /**
   * Free-text message body written by the sender.
   * LibreTranslate will auto-translate it for each recipient's language.
   * Mutually exclusive with `templateId`.
   */
  freeTextOriginal: z.string().min(1).optional(),
  /** Channels to deliver through. At least one required. */
  channels: z.array(z.nativeEnum(MessageChannel)).min(1),
  /** ISO 8601 datetime for scheduled delivery. Sends immediately when omitted. */
  scheduledAt: z.string().datetime().optional(),
  // ── REGISTERED mode ────────────────────────────────────────────────────────
  /** UUIDs of the registered recipients to target (required in REGISTERED mode). */
  recipientIds: z.array(z.string().uuid()).optional(),
  /** Variable values applied to all recipients in this dispatch. */
  globalVariables: z.record(z.string()).optional(),
  /**
   * Per-recipient variable overrides.
   * Key = recipientId, value = variable map.
   * Overrides `globalVariables` for the matching recipient.
   */
  recipientVariables: z.record(z.record(z.string())).optional(),
  // ── ANONYMOUS mode ─────────────────────────────────────────────────────────
  /** Anonymous targets (required in ANONYMOUS mode). */
  targets: z.array(DispatchTargetSchema).optional(),
});

/** Schema for the dispatch object returned by the API. */
export const DispatchResponseSchema = z.object({
  id: z.string().uuid(),
  recipientMode: z.nativeEnum(RecipientMode),
  templateId: z.string().uuid().nullable().optional(),
  freeTextOriginal: z.string().nullable().optional(),
  status: z.nativeEnum(DispatchStatus),
  scheduledAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Total number of messages created for this dispatch. */
  messageCount: z.number().int().nonnegative().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateDispatchSchema} */
export type TCreateDispatch = z.infer<typeof CreateDispatchSchema>;

/** @see {@link DispatchTargetSchema} */
export type TDispatchTarget = z.infer<typeof DispatchTargetSchema>;

/** @see {@link DispatchResponseSchema} */
export type TDispatchResponse = z.infer<typeof DispatchResponseSchema>;
