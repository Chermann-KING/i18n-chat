/** BullMQ queue name for email delivery jobs. */
export const QUEUE_EMAIL = 'email-messages' as const;

/** BullMQ queue name for SMS delivery jobs. */
export const QUEUE_SMS = 'sms-messages' as const;

/** BullMQ queue name for WhatsApp delivery jobs. */
export const QUEUE_WHATSAPP = 'whatsapp-messages' as const;

/**
 * Default BullMQ job options for all delivery queues.
 *
 * Retries 3 times with exponential back-off: 1 s → 2 s → 4 s.
 */
export const DISPATCH_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1_000 },
} as const;

/**
 * Payload stored in every delivery queue job.
 *
 * Workers read this data to call the appropriate channel adapter.
 */
export interface DeliveryJobData {
  /** UUID of the {@link Message} record to update after delivery. */
  readonly messageId: string;
  /** E.164 phone number or email address of the recipient. */
  readonly contact: string;
  /** Rendered message body (used for email/SMS and WhatsApp text messages). */
  readonly body: string;
  /** ISO 639-1 language code — used by WhatsApp template messages. */
  readonly languageCode: string;
  /** WhatsApp HSM template name — present only for WhatsApp template dispatches. */
  readonly waTemplateName?: string;
  /** Ordered variable values for the WhatsApp template body component. */
  readonly waTemplateComponents?: string[];
}
