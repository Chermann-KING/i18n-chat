import type { MessageChannel } from '../enums/message-channel.enum';

/**
 * Payload required to send a single message through any channel.
 */
export interface SendMessagePayload {
  /** The recipient's contact value: email address or E.164 phone number. */
  readonly contact: string;

  /** The fully-rendered message body (already translated and variable-substituted). */
  readonly body: string;

  /**
   * Optional subject line — used by the Email channel only.
   * Ignored by SMS and WhatsApp channels.
   */
  readonly subject?: string;

  /**
   * WhatsApp-specific: the Meta-approved HSM template name.
   * Required when sending via WhatsApp; ignored by other channels.
   */
  readonly waTemplateName?: string;

  /**
   * WhatsApp-specific: ordered list of variable values to inject into the approved template.
   * Required when `waTemplateName` is set.
   */
  readonly waTemplateComponents?: string[];
}

/**
 * Port interface for message delivery channels.
 *
 * All concrete implementations (EmailChannel, SmsChannel, WhatsAppChannel)
 * must satisfy this contract, allowing DispatchService to remain decoupled
 * from any specific provider.
 *
 * @example Implementing a new channel
 * ```ts
 * export class TelegramChannel implements IMessageChannel {
 *   readonly channel = MessageChannel.TELEGRAM;
 *   async send(payload: SendMessagePayload): Promise<string> { ... }
 *   validateContact(contact: string): boolean { ... }
 * }
 * ```
 */
export interface IMessageChannel {
  /** The channel identifier this implementation handles. */
  readonly channel: MessageChannel;

  /**
   * Sends a message to a single recipient contact.
   *
   * @param payload - The message payload to deliver.
   * @returns The provider-assigned message ID (for delivery tracking).
   * @throws {AppException} On unrecoverable send failure.
   */
  send(payload: SendMessagePayload): Promise<string>;

  /**
   * Validates whether a contact value is syntactically acceptable for this channel.
   * (E.164 format for SMS/WhatsApp; RFC 5322 for Email)
   *
   * @param contact - The contact value to validate.
   * @returns `true` if the contact is valid, `false` otherwise.
   */
  validateContact(contact: string): boolean;
}
