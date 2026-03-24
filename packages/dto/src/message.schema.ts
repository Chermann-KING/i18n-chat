import { z } from 'zod';
import { MessageChannel, MessageStatus } from '@i18n-chat/domain';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Schema for the message object returned by the API. */
export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  dispatchId: z.string().uuid(),
  /** Set when the recipient is a registered profile. */
  recipientId: z.string().uuid().nullable().optional(),
  /** Set when the recipient is an anonymous target. */
  anonymousTargetId: z.string().uuid().nullable().optional(),
  channel: z.nativeEnum(MessageChannel),
  languageCode: z.string(),
  status: z.nativeEnum(MessageStatus),
  /** Provider-assigned message ID returned after delivery (Brevo, Twilio, Meta…). */
  providerMessageId: z.string().nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Schema for a paginated list of messages. */
export const MessageListResponseSchema = z.object({
  data: z.array(MessageResponseSchema),
  total: z.number().int().nonnegative(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link MessageResponseSchema} */
export type TMessageResponse = z.infer<typeof MessageResponseSchema>;

/** @see {@link MessageListResponseSchema} */
export type TMessageListResponse = z.infer<typeof MessageListResponseSchema>;
